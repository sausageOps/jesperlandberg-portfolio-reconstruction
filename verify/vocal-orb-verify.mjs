/** Phase 5J isolated checks. npm i --no-save --package-lock=false jsdom@26
 * CARTER_SOURCE=/tmp/vocal-orb-carter.js node verify/vocal-orb-verify.mjs
 * Browser, WebGL, microphone and worker objects here are test doubles, not parity evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { mountVocalOrbTune } from '../src/carter/pages/lab/vocal-orb-tune.js';

const source = fs.readFileSync(process.env.CARTER_SOURCE || '/tmp/vocal-orb-carter.js', 'utf8');
const portText = fs.readFileSync('src/carter/engines/vocal-orb.js', 'utf8');
const original = await import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { T as testWorkerSource, E as testWorkletSource };').toString('base64'));
const port = await import('data:text/javascript;base64,' + Buffer.from(portText + '\nexport { pe as testWorker, me as testWorklet, T as testWorkerSource, E as testWorkletSource };').toString('base64'));
assert.deepEqual(port.config, original.config);
assert.deepEqual(port.config.map(x => x.key), ['heart','rest','view','flare','bloom','speed','energy','spread','size']);
assert.equal(port.testWorkerSource, original.testWorkerSource); assert.equal(port.testWorkletSource, original.testWorkletSource);
console.log('PASS config, worker and worklet source equal pinned source');

const rawCss = source.match(/h=`exp-orb-style`,g=`([\s\S]*?)`;function _\(\)/)[1];
const carterCss = postcss.parse(rawCss), scopedCss = postcss.parse(fs.readFileSync('src/carter/pages/lab/vocal-orb.css','utf8'));
const rules = root => { const arr=[]; root.walkRules(rule => { if (!rule.selector.includes('orb-tune__')) arr.push([rule.parent.type === 'atrule' ? rule.parent.params : '', rule.selector, rule.nodes.map(d=>[d.prop,d.value])]); }); return arr; };
const expected=rules(carterCss).map(([media,selector,decl])=>[media,selector.split(',').map(s=>`:where(.carter) ${s.trim()}`).join(','),decl]);
assert.deepEqual(rules(scopedCss).map(([m,s,d])=>[m,s.replace(/,\s*/g,','),d]),expected);
console.log('PASS source CSS rules match with scope');

const dom = new JSDOM('<!doctype html><div class="carter"><div id="viewport"></div></div>', {url:'https://example.test/',pretendToBeVisual:true});
const win = dom.window;
for (const key of ['window','document','navigator','localStorage','HTMLElement','HTMLInputElement','AbortController','Event','Blob','URL']) Object.defineProperty(globalThis, key, { value: win[key], configurable: true, writable: true });
win.matchMedia = () => ({matches:true,addEventListener(){},removeEventListener(){}});
Object.defineProperty(win.HTMLElement.prototype,'clientWidth',{get(){return 900}});
Object.defineProperty(win.HTMLElement.prototype,'clientHeight',{get(){return 700}});
win.Element.prototype.animate = () => ({finished:Promise.resolve(),cancel(){}});
win.Element.prototype.getAnimations = () => [];
let raf = 0; const frames = new Map();
globalThis.requestAnimationFrame = f => { frames.set(++raf,f); return raf; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
let observers = 0;
globalThis.ResizeObserver = class { constructor() { observers++; } observe() {} disconnect() { observers--; } };
globalThis.IntersectionObserver = class { constructor() { observers++; } observe() {} disconnect() { observers--; } };
let shaders = [], lost = 0, bloom = false;
const gl = new Proxy({getExtension(name){if(name==='WEBGL_lose_context')return {loseContext(){lost++}};if(bloom && name==='EXT_color_buffer_float')return {};return null}, createShader(){return {}},shaderSource(_,s){shaders.push(s)},getShaderParameter(){return true},getProgramParameter(){return true},getUniformLocation(){return {}}, createProgram(){return {}},createVertexArray(){return {}}}, {get(t,p){ if (p in t) return t[p]; if (typeof p === 'string' && p.toUpperCase() === p) return 1; return () => {}; }});
let useGl = true;
win.HTMLCanvasElement.prototype.getContext = function(name){return name === 'webgl2' && useGl ? gl : null};
const viewport = document.querySelector('#viewport');
function mount(engine) { shaders=[]; let instance=engine.default.mount(viewport,{captionHost:'https://models.carterogunsola.com'}); return {instance, shaders: [...shaders], html:viewport.querySelector('.orb')?.outerHTML}; }
let a=mount(original); a.instance.destroy();
let b=mount(port); assert.deepEqual(b.shaders,a.shaders); assert.equal(b.html,a.html.replace('class="orb__cap" aria-hidden="true"','class="orb__cap"')); b.instance.destroy();
assert.equal(viewport.childElementCount,0); assert.equal(observers,0); assert.equal(frames.size,0); assert.equal(lost,2);
console.log('PASS source WebGL direct shaders and initial DOM; observer/RAF teardown');
bloom=true; a=mount(original); a.instance.destroy(); b=mount(port); assert.deepEqual(b.shaders,a.shaders); b.instance.destroy(); bloom=false; assert.equal(observers,0); assert.equal(frames.size,0);
console.log('PASS source bloom shader variants and cleanup');
useGl=false; let fallback=port.default.mount(viewport); assert.match(viewport.textContent,/needs WebGL2/); fallback(); assert.equal(viewport.childElementCount,0); useGl=true;
console.log('PASS no-WebGL fallback');

// Permission resolves after destroy: the returned track must be stopped, and no AudioContext created.
let resolveMic, stopped=0, contexts=0;
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(r=>resolveMic=r)}});
globalThis.AudioContext=class { constructor(){contexts++} };
b=mount(port); viewport.querySelector('.orb__mic').click(); b.instance.destroy(); resolveMic({getTracks:()=>[{stop(){stopped++}}]});
await Promise.resolve(); await Promise.resolve(); assert.equal(stopped,1); assert.equal(contexts,0); assert.equal(viewport.childElementCount,0);
console.log('PASS late microphone permission is released');
// Successful audio setup, effect selection and stop use recording test doubles.
let trackStops=0, audioClosed=0;
const node=()=>({frequency:{value:0},threshold:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},gain:{value:0,setTargetAtTime(){}},delayTime:{value:0}, connect(other){return other},disconnect(){},start(){},stop(){}});
globalThis.AudioContext=class {
  constructor(){this.sampleRate=48000;this.destination=node()}
  createAnalyser(){return {...node(),fftSize:1024,frequencyBinCount:512}}
  createMediaStreamSource(){return node()} createBiquadFilter(){return node()} createDynamicsCompressor(){return node()} createGain(){return node()} createConvolver(){return node()} createDelay(){return node()} createOscillator(){return node()} createWaveShaper(){return node()}
  createBuffer(_, length){return {getChannelData(){return new Float32Array(length)}}} close(){audioClosed++;return Promise.resolve()} resume(){return Promise.resolve()}
};
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){trackStops++}}]})}});
b=mount(port); const mic=viewport.querySelector('.orb__mic');mic.click();await Promise.resolve();await Promise.resolve();
assert.equal(mic.getAttribute('aria-pressed'),'true');viewport.querySelector('.orb__spk').click();
for(const effect of ['hall','delay','radio','robot','room']) viewport.querySelector(`[data-id="${effect}"]`).click();
mic.click();assert.equal(trackStops,1);assert.equal(audioClosed,1);b.instance.destroy();assert.equal(trackStops,1);assert.equal(observers,0);
console.log('PASS audio graph effect selection and track/context stop with doubles');


// Nine Tune controls: defaults, update, reset, persistence and event cleanup.
const detail=document.createElement('div');detail.innerHTML='<button data-config-toggle hidden></button><aside data-config-panel hidden><button data-config-reset></button><div data-config-body></div></aside>';document.body.append(detail);
const sets=[];const instance={set:(key,value)=>sets.push([key,value])};let cleanup=mountVocalOrbTune(detail,instance,port.config);
assert.equal(sets.length,9); assert.equal(detail.querySelectorAll('[role=slider]').length,8);assert.equal(detail.querySelectorAll('.labcfg__seg-btn').length,3);
detail.querySelector('[data-config-toggle]').click();assert.equal(detail.querySelector('[data-config-toggle]').getAttribute('aria-expanded'),'true');
const otherSliders=[...detail.querySelectorAll('[role=slider]')].slice(1);
for (const input of otherSliders) input.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
const beforeHeart=sets.length; detail.querySelector('.labcfg__seg-btn').click(); assert.deepEqual(sets[beforeHeart],['heart','glass']);
assert.equal(detail.querySelector('.labcfg__seg-btn').getAttribute('aria-pressed'),'true');

let slider=detail.querySelector('[role=slider]'); for (let j=0;j<6;j++) slider.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); assert.equal(JSON.parse(localStorage.getItem('labcfg:vocal-orb')).values.rest,0.5);
cleanup();const n=sets.length;slider.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowLeft'}));assert.equal(sets.length,n);cleanup=mountVocalOrbTune(detail,instance,port.config);assert.deepEqual(sets.at(-8),['rest',0.5]);detail.querySelector('[data-config-reset]').click();assert.equal(JSON.parse(localStorage.getItem('labcfg:vocal-orb')).values.rest,0.8);cleanup();assert.equal(detail.querySelector('[data-config-toggle]').hidden,true);
console.log('PASS Tune defaults, changes, persistence, reset and cleanup');

// Test worker message contract and teardown while load is pending.
let seq=0;const blobs=new Set(); URL.createObjectURL=()=>{let id='blob:test'+ ++seq;blobs.add(id);return id};URL.revokeObjectURL=id=>blobs.delete(id);
class WorkerStub extends win.EventTarget { constructor(){super();this.messages=[];this.terminated=false}postMessage(data){this.messages.push(data)}terminate(){this.terminated=true} }
globalThis.Worker=WorkerStub;
let client=port.testWorker('https://models.carterogunsola.com');let pending=client.need('captions');assert.deepEqual(client.worker.messages[0],{type:'load',part:'captions',runtime:'https://models.carterogunsola.com/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js',phonemizer:'https://models.carterogunsola.com/npm/phonemizer@1.2.1/dist/phonemizer.js',host:'https://models.carterogunsola.com'});client.destroy();await assert.rejects(pending);assert.equal(client.worker.terminated,true);assert.equal(blobs.size,0);
console.log('PASS worker URL contract and pending-load teardown');

// Worklet addModule resolves after stop: no node can be attached and context closes.
let resolveModule, closed=0, nodes=0;
globalThis.AudioContext=class { constructor(){this.state='running';this.audioWorklet={addModule:()=>new Promise(r=>resolveModule=r)}} close(){if(this.state!=='closed'){closed++;this.state='closed'}return Promise.resolve()} };
globalThis.AudioWorkletNode=class {constructor(){nodes++}};
client=port.testWorker('https://models.carterogunsola.com');
const dummy={progress(){},show(){},end(){},failed(){}};const recognizer=port.testWorklet(dummy,client);
const started=recognizer.start({});client.worker.dispatchEvent(new win.MessageEvent('message',{data:{type:'ready',part:'captions'}}));await Promise.resolve(); await Promise.resolve();assert.ok(resolveModule);recognizer.destroy();resolveModule();await started;assert.equal(closed,1);assert.equal(nodes,0);client.destroy();assert.equal(blobs.size,0);
console.log('PASS worklet pending-addModule teardown');
// Real React route, lazy engine import and keyed page lifecycle (still fake WebGL).
const { createServer } = await import('vite');
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.MutationObserver = win.MutationObserver;
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { default: CarterRoute } = await server.ssrLoadModule('/src/carter/CarterRoute.jsx');
  const { resolveCarterPage } = await server.ssrLoadModule('/src/carter/routes.js');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const route = slug => createElement(CarterRoute, {page: resolveCarterPage(`/routes/lab/${slug}`), appReady:true, onNavigate:()=>{}, placeholder:null});
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  for (let i=0;i<3;i++) {
    await act(async()=>{root.render(route('vocal-orb')); await wait(40)});
    for(let j=0;j<20&&!host.querySelector('.orb');j++) await act(async()=>{await wait(30)});
    assert.equal(host.querySelectorAll('.orb').length,1);
    assert.ok(host.querySelector('[data-lab-detail]').hasAttribute('data-stage-live'));
    assert.equal(host.querySelectorAll('[role=slider]').length,8);
    await act(async()=>{root.render(createElement(CarterRoute,{page:{key:'unregistered'},appReady:true,onNavigate:()=>{}})); await wait(10)});
    assert.equal(host.querySelectorAll('.orb').length,0); assert.equal(observers,0); assert.equal([...frames.values()].filter(f=>f.name !== '_tick').length,0);
  }
  await act(async()=>root.unmount()); host.remove();
  console.log('PASS React route integration and repeated keyed mount/unmount');
} finally { await server.close(); }
win.close();
