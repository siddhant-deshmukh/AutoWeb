import { callRPC } from "./getFromContentScript";

export async function getSimplifiedDom() {
  const fullDom = await callRPC('GET_COMPREESED_DOM', undefined, 3);
  if (!fullDom) return null;

  // console.log("fullDom", fullDom)
  if (!fullDom) return null;

  const dom = new DOMParser().parseFromString(fullDom, 'text/html');

  // Mount the DOM to the document in an iframe so we can use getComputedStyle

  const interactiveElements: HTMLElement[] = [];

  console.log("before simplified", dom.documentElement)
  // const simplifiedDom = generateSimplifiedDom(
  //   dom.documentElement,
  //   interactiveElements
  // ) as HTMLElement;

  const compressed_DOM_childs = compressDOM(dom.documentElement)
  const compressed_DOM = document.createElement("div")
  if (compressed_DOM_childs) {
    compressed_DOM_childs.forEach((child) => compressed_DOM.appendChild(child));
  }

  // const simplifiedDom2 = generateSimplifiedDom(
  //   dom.documentElement,
  //   interactiveElements
  // ) as HTMLElement;


  console.log("Simplified DOM", compressed_DOM)
  // console.log("Simplified DOM 2", simplifiedDom2)

  return compressed_DOM;
}

function generateSimplifiedDom(
  element: ChildNode,
  interactiveElements: HTMLElement[]
): ChildNode | null {
  if (element.nodeType === Node.TEXT_NODE && element.textContent?.trim()) {
    return document.createTextNode(element.textContent + ' ');
  }

  if (!(element instanceof HTMLElement || element instanceof SVGElement))
    return null;

  const isVisible = element.getAttribute('data-visible') === 'true';
  if (!isVisible) return null;

  let children = Array.from(element.childNodes)
    .map((c) => generateSimplifiedDom(c, interactiveElements))
    .filter(truthyFilter);

  // Don't bother with text that is the direct child of the body
  if (element.tagName === 'BODY')
    children = children.filter((c) => c.nodeType !== Node.TEXT_NODE);

  const interactive =
    element.getAttribute('data-interactive') === 'true' ||
    element.hasAttribute('role');
  const hasLabel =
    element.hasAttribute('aria-label') || element.hasAttribute('name');
  const includeNode = interactive || hasLabel;

  if (!includeNode && children.length === 0) return null;
  if (!includeNode && children.length === 1) {
    return children[0];
  }

  const container = document.createElement(element.tagName);

  const allowedAttributes = [
    'aria-label',
    'data-name',
    'name',
    'type',
    'placeholder',
    'value',
    'role',
    'title',
  ];

  for (const attr of allowedAttributes) {
    if (element.hasAttribute(attr)) {
      container.setAttribute(attr, element.getAttribute(attr) as string);
    }
  }

  if (interactive) {
    interactiveElements.push(element as HTMLElement);
    container.setAttribute('id', element.getAttribute('data-id') as string);
  }

  children.forEach((child) => container.appendChild(child));

  return container;
}

function compressDOM(
  element: ChildNode
): ChildNode[] | null {
  if (element.nodeType === Node.TEXT_NODE && element.textContent?.trim()) {
    return [document.createTextNode(element.textContent + ' ')];
  }
  if (!(element instanceof HTMLElement || element instanceof SVGElement))
    return null;

  const isVisible = element.getAttribute('data-visible') === 'true';
  // console.log(isVisible, "Here", element.tagName, element.attributes, element.id)
  if (!isVisible) return null;


  const excludeTags = [
    'br', 'hr', 'meta', 'script', 'style', 'link', 'noscript',
    'iframe', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
    'polygon', 'figure', 'figcaption', 'canvas', 'audio', 'video',
    'source', 'track', 'map', 'area', 'comment'
  ];
  if (excludeTags.includes(element.tagName.toLowerCase()) || element.nodeType === Node.COMMENT_NODE) {
    // element.parentNode.removeChild(element);
    return null;
  }

  let children: ChildNode[] = []

  Array.from(element.childNodes)
    .forEach((c) => {
      const childs = compressDOM(c)?.filter(truthyFilter)
      if (Array.isArray(childs)) {
        children = children.concat(childs)
      }
    })

  // console.log(element.id , children.length)
  // Don't bother with text that is the direct child of the body
  if (element.tagName === 'BODY')
    children = children.filter((c) => c.nodeType !== Node.TEXT_NODE);

  const interactive =
    element.getAttribute('data-interactive') === 'true' ||
    element.hasAttribute('role');
  const hasLabel =
    element.hasAttribute('aria-label') || element.hasAttribute('name');
  const includeNode = interactive || hasLabel;

  if (!includeNode && children.length === 0) return null;
  if (!includeNode && children.length === 1) {
    return children;
  }

  const allowedAttributes = [
    'aria-label',
    'aria-describedby',
    'aria-expanded',
    'data-name',
    'alt',
    'checked',
    'for',
    'form',
    // 'href',
    // 'id',
    'label',
    'name',
    // 'onchange',
    // 'onclick',
    'placeholder',
    'required',
    'role',
    'selected',
    'title',
    'type',
    'value',

    // 'onclick',
    // 'onmousedown',
    // 'onmouseup',
    // 'onkeydown',
    // 'onkeyup',
  ];

  let hasAAttribute = false
  for (const attr of allowedAttributes) {
    if (element.hasAttribute(attr)) {
      hasAAttribute = true;
      break;
    }
  }
  if (!(hasAAttribute || interactive)) return children;

  // console.log(element.attributes, hasAAttribute, interactive)

  const container = document.createElement(element.tagName);
  for (const attr of allowedAttributes) {
    if (element.hasAttribute(attr)) {
      container.setAttribute(attr, element.getAttribute(attr) as string);
    }
  }

  if (interactive) {
    // interactiveElements.push(element as HTMLElement);
    container.setAttribute('id', element.getAttribute('data-id') as string);
    // container.setAttribute('isInteractive', 'true' as string);
    // console.log(container.id, container.tagName, container.attributes.toString(), interactive, hasAAttribute)
  }

  children.forEach((child) => container.appendChild(child));

  return [container];
}

export function truthyFilter<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}