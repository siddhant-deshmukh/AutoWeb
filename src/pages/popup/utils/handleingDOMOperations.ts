import { callRPC, sleep } from "./getFromContentScript";

const TAXY_ELEMENT_SELECTOR = 'data-taxy-node-id'

async function sendCommand(method: string, tabId: number, params?: any) {
  // const tabId = useAppState.getState().currentTask.tabId;
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

export async function getCenterCoordinates(tabId: number, objectId: string) {
  const { model } = (await sendCommand('DOM.getBoxModel', tabId, { objectId })) as any;
  const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
  const centerX = (x1 + x3) / 2;
  const centerY = (y1 + y3) / 2;
  return { x: centerX, y: centerY };
}

async function selectAllText(tabId: number, x: number, y: number) {
  await clickAtPosition(tabId, x, y, 3);
}

async function clickAtPosition(
  tabId: number,
  x: number,
  y: number,
  clickCount = 1
): Promise<void> {
  callRPC('RIPPLE', [x, y]);

  await sendCommand('Input.dispatchMouseEvent', tabId, {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount,
  });
  await sendCommand('Input.dispatchMouseEvent', tabId, {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount,
  });
  await sleep(1000);
}

export async function typeText(tabId: number, text: string): Promise<void> {
  for (const char of text) {
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      text: char,
    });
    await sleep(50);

    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      text: char,
    });

    await sleep(50);
  }

  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(50);
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  
}

async function scrollIntoView(tabId: number, objectId: string) {
  await sendCommand('Runtime.callFunctionOn', tabId, {
    objectId,
    functionDeclaration: scrollIntoViewFunction.toString(),
  });
  await sleep(1000);
}

function scrollIntoViewFunction() {
  this.scrollIntoView({
    block: 'center',
    inline: 'center',
    // behavior: 'smooth',
  });
}

export async function setValue(
  tabId: number,
  objectId: string,
  value: string
): Promise<void> {
  // const objectId = await getObjectId(payload.elementId);
  await scrollIntoView(tabId, objectId);
  const { x, y } = await getCenterCoordinates(tabId, objectId);

  await selectAllText(tabId, x, y);
  await typeText(tabId, value);
  // blur the element
  // await blurFocusedElement(tabId);
}

export async function domClick(tabId: number, objectId: string) {
  // const objectId = await getObjectId(payload.elementId);
  await scrollIntoView(tabId, objectId);
  const { x, y } = await getCenterCoordinates(tabId, objectId);
  await clickAtPosition(tabId, x, y);
}

async function blurFocusedElement(tabId: number) {
  const blurFocusedElementScript = `
      if (document.activeElement) {
        document.activeElement.blur();
      }
    `;
  await sendCommand('Runtime.evaluate', tabId, {
    expression: blurFocusedElementScript,
  });
}

export async function getObjectId(originalId: number, tabId: number) {
  const uniqueId = await callRPC('GET_REAL_OBJECT_ID', originalId, 3);

  // const uniqueId = await callRPC('getUniqueElementSelectorId', [originalId]);
  // get node id

  const document = (await sendCommand('DOM.getDocument', tabId)) as any;
  const { nodeId } = (await sendCommand('DOM.querySelector', tabId, {
    nodeId: document.root.nodeId,
    selector: `[${TAXY_ELEMENT_SELECTOR}="${uniqueId}"]`,
  })) as any;

  if (!nodeId) {
    throw new Error('Could not find node');
  }
  // get object id
  const result = (await sendCommand('DOM.resolveNode', tabId, { nodeId })) as any;
  const objectId = result.object.objectId;

  if (!objectId) {
    throw new Error('Could not find object');
  }
  return objectId;
}