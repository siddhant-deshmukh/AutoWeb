import { callRPC } from "./getFromContentScript";

const TAXY_ELEMENT_SELECTOR = 'data-taxy-node-id'

async function sendCommand(method: string, tabId: number, params?: any) {
  // const tabId = useAppState.getState().currentTask.tabId;
  return chrome.debugger.sendCommand({ tabId }, method, params);
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