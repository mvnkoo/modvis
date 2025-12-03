declare module '*.js' {
  const content: any;
  export default content;
}

declare module '*.wasm' {
  const content: string;
  export default content;
}


declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';

declare module '@thatopen/components' {
  import { Scene, Color, WebGLRenderer, Camera, PerspectiveCamera } from 'three';

  export class Components {
    init(): void;
    get(type: any): any;
    add(component: any): void;
    dispose?(): void;
  }

  export class Worlds {
    create(): any;
  }

  export class FragmentsManager {
    constructor(components: Components);
    uuid: string;
    load(file: File): Promise<any>;
  }

  export class SimpleScene {
    constructor(components: Components);
    three: Scene;
    setup(config: { background: { r: number; g: number; b: number } }): void;
  }

  export class SimpleCamera {
    constructor(components: Components);
    controls: {
      camera: PerspectiveCamera;
      setLookAt(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void;
    };
  }

  export class SimpleRenderer {
    constructor(components: Components, container: HTMLElement);
    get(): WebGLRenderer;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
}


interface Navigator {
  gpu: GPU;
}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): GPUTextureFormat;
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
  requestAdapterInfo(): Promise<GPUAdapterInfo>;
}

interface GPUAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

interface HTMLCanvasElement {
  getContext(contextId: 'webgpu'): GPUCanvasContext | null;
}


type GPUDeviceDescriptor = {
  requiredFeatures?: GPUFeatureName[];
  requiredLimits?: Record<string, number>;
  defaultQueue?: GPUQueueDescriptor;
};

type GPUFeatureName = string;
type GPUQueueDescriptor = {};
type GPUTextureFormat = string;
type GPURequestAdapterOptions = {
  powerPreference?: 'high-performance' | 'low-power';
};

interface GPUDevice {
  queue: GPUQueue;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  destroy(): void;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
}

interface GPUCanvasContext {
  configure(configuration: GPUCanvasConfiguration): void;
  getCurrentTexture(): GPUTexture;
}

interface GPUCanvasConfiguration {
  device: GPUDevice;
  format: GPUTextureFormat;
  alphaMode?: 'premultiplied' | 'unpremultiplied' | 'opaque';
}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
  finish(): GPUCommandBuffer;
}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setVertexBuffer(slot: number, buffer: GPUBuffer, offset?: number, size?: number): void;
  setIndexBuffer(buffer: GPUBuffer, format: GPUIndexFormat, offset?: number, size?: number): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  drawIndexed(indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number): void;
  end(): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
}

interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource, dataOffset?: number, size?: number): void;
}

interface GPUTexture {
  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
  width: number;
  height: number;
  destroy(): void;
}

interface GPURenderPassDescriptor {
  colorAttachments: GPURenderPassColorAttachment[];
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
}

interface GPURenderPassColorAttachment {
  view: GPUTextureView;
  clearValue?: GPUColor;
  loadOp: 'clear' | 'load';
  storeOp: 'store' | 'discard';
}

interface GPUColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface GPUCommandBuffer {}
interface GPUTextureView {}


type GPUVertexFormat = 'uint8x2' | 'uint8x4' | 'sint8x2' | 'sint8x4' | 'unorm8x2' | 'unorm8x4' | 
  'snorm8x2' | 'snorm8x4' | 'uint16x2' | 'uint16x4' | 'sint16x2' | 'sint16x4' | 'unorm16x2' | 
  'unorm16x4' | 'snorm16x2' | 'snorm16x4' | 'float16x2' | 'float16x4' | 'float32' | 'float32x2' | 
  'float32x3' | 'float32x4' | 'uint32' | 'uint32x2' | 'uint32x3' | 'uint32x4' | 'sint32' | 
  'sint32x2' | 'sint32x3' | 'sint32x4';

type GPUPrimitiveTopology = 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
type GPUIndexFormat = 'uint16' | 'uint32';
type GPUFrontFace = 'ccw' | 'cw';
type GPUCullMode = 'none' | 'front' | 'back';

const GPUBufferUsage = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
} as const;

interface GPUBuffer {
  destroy(): void;
}

interface GPUBufferDescriptor {
  size: number;
  usage: number;
  mappedAtCreation?: boolean;
}

interface GPUShaderModule {
  compilationInfo(): Promise<GPUCompilationInfo>;
}

interface GPUShaderModuleDescriptor {
  code: string;
  sourceMap?: object;
}

interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

interface GPURenderPipelineDescriptor {
  layout: 'auto' | GPUPipelineLayout;
  vertex: GPUVertexState;
  fragment?: GPUFragmentState;
  primitive?: GPUPrimitiveState;
  depthStencil?: GPUDepthStencilState;
  multisample?: GPUMultisampleState;
}

interface GPUVertexState {
  module: GPUShaderModule;
  entryPoint: string;
  buffers?: GPUVertexBufferLayout[];
}

interface GPUVertexBufferLayout {
  arrayStride: number;
  attributes: GPUVertexAttribute[];
  stepMode?: 'vertex' | 'instance';
}

interface GPUVertexAttribute {
  format: GPUVertexFormat;
  offset: number;
  shaderLocation: number;
}

interface GPUFragmentState {
  module: GPUShaderModule;
  entryPoint: string;
  targets: GPUColorTargetState[];
}

interface GPUColorTargetState {
  format: GPUTextureFormat;
  blend?: GPUBlendState;
  writeMask?: number;
}

interface GPUPrimitiveState {
  topology: GPUPrimitiveTopology;
  stripIndexFormat?: GPUIndexFormat;
  frontFace?: GPUFrontFace;
  cullMode?: GPUCullMode;
  unclippedDepth?: boolean;
}

interface GPUBindGroup {
  label?: string;
}

interface GPUBindGroupLayout {
  label?: string;
}

interface GPUBindGroupDescriptor {
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
  label?: string;
}

interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBindingResource;
}

interface GPUBindingResource {
  buffer?: GPUBuffer;
  offset?: number;
  size?: number;
}

interface GPUPipelineLayout {
  label?: string;
}

interface GPUPipelineLayoutDescriptor {
  bindGroupLayouts: GPUBindGroupLayout[];
  label?: string;
}

const GPUShaderStage = {
  VERTEX: 1,
  FRAGMENT: 2,
  COMPUTE: 4,
} as const;

interface GPUDevice {
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
}

interface GPURenderPassEncoder {
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
}

interface GPUTextureDescriptor {
  size: GPUExtent3D;
  format: GPUTextureFormat;
  usage: number;
  dimension?: GPUTextureDimension;
  mipLevelCount?: number;
  sampleCount?: number;
  viewFormats?: GPUTextureFormat[];
}

interface GPUExtent3D {
  width: number;
  height: number;
  depthOrArrayLayers?: number;
}

interface GPUTexture {
  width: number;
  height: number;
  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
  destroy(): void;
}

const GPUTextureUsage = {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
} as const;

interface GPURenderPassDescriptor {
  colorAttachments: GPURenderPassColorAttachment[];
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
}

interface GPURenderPassDepthStencilAttachment {
  view: GPUTextureView;
  depthClearValue?: number;
  depthLoadOp: 'clear' | 'load';
  depthStoreOp: 'store' | 'discard';
  stencilClearValue?: number;
  stencilLoadOp?: 'clear' | 'load';
  stencilStoreOp?: 'store' | 'discard';
} 