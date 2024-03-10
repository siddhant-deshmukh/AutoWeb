// import { sleep } from "../../popup/utils/getFromContentScript";

const TAXY_ELEMENT_SELECTOR = 'data-taxy-node-id'

function isInteractive(
  element: HTMLElement,
  style: CSSStyleDeclaration
): boolean {
  return (
    element.tagName === 'A' ||
    element.tagName === 'INPUT' ||
    element.tagName === 'BUTTON' ||
    element.tagName === 'SELECT' ||
    element.tagName === 'TEXTAREA' ||
    element.hasAttribute('onclick') ||
    element.hasAttribute('onmousedown') ||
    element.hasAttribute('onmouseup') ||
    element.hasAttribute('onkeydown') ||
    element.hasAttribute('onkeyup') ||
    style.cursor === 'pointer'
  );
}

function isVisible(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  return (
    style.opacity !== '' &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

let currentElements: HTMLElement[] = [];

function traverseDOM(node: Node, pageElements: HTMLElement[]) {
  const clonedNode = node.cloneNode(false) as Node;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const style = window.getComputedStyle(element);

    const clonedElement = clonedNode as HTMLElement;

    pageElements.push(element);
    clonedElement.setAttribute('data-id', (pageElements.length - 1).toString());
    clonedElement.setAttribute(
      'data-interactive',
      isInteractive(element, style).toString()
    );
    clonedElement.setAttribute(
      'data-visible',
      isVisible(element, style).toString()
    );
  }

  node.childNodes.forEach((child) => {
    const result = traverseDOM(child, pageElements);
    clonedNode.appendChild(result.clonedDOM);
  });

  return {
    pageElements,
    clonedDOM: clonedNode,
  };
}

/**
 * getAnnotatedDom returns the pageElements array and a cloned DOM
 * with data-pe-idx attributes added to each element in the copy.
 */
export default function getAnnotatedDOM() {
  currentElements = [];
  const result = traverseDOM(document.documentElement, currentElements);
  console.log(result.clonedDOM)
  return (result.clonedDOM as HTMLElement).outerHTML;
}

// idempotent function to get a unique id for an element
export function getUniqueElementSelectorId(id: number): string {
  const element = currentElements[id];
  // element may already have a unique id

  let uniqueId = element.getAttribute(TAXY_ELEMENT_SELECTOR);
  console.log("getUniqueElementSelectorId", id, uniqueId)
  if (uniqueId) return uniqueId;
  uniqueId = Math.random().toString(36).substring(2, 10);
  element.setAttribute(TAXY_ELEMENT_SELECTOR, uniqueId);
  
  return uniqueId;
}


export async function ripple(x: number, y: number) {
  const rippleRadius = 30;
  const ripple = document.createElement('div');
  ripple.classList.add('web-agent-ripple');
  ripple.style.width = ripple.style.height = `${rippleRadius * 2}px`;
  // Take scroll position into account
  ripple.style.top = `${window.scrollY + y - rippleRadius}px`;
  ripple.style.left = `${x - rippleRadius}px`;

  document.body.appendChild(ripple);

  await sleep(1000);
  ripple.remove();
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}