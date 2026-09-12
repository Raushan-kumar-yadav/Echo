 
import { createContext, useContext } from 'react';

 
export type ActiveTool =
  // Timeline editing tools
  | 'pointer'       
  | 'razor'        
  | 'ripple'        
  | 'slip'         
  | 'hand'         
  | 'selectLeft'  
  | 'selectRight'   
  // Creation tools
  | 'text'          
  | 'solid'        
  // Shape sub-tools  
  | 'shape:rect'
  | 'shape:circle'
  | 'shape:ellipse'
  | 'shape:star'
  | 'shape:polygon'
  | 'shape:line'
  | 'shape:arc'
  | 'shape:path'    
  // Adjustment
  | 'adjustment';

//   Pen sub-modes 
export type PenSubMode =
  | 'pen:add'       
  | 'pen:select'    
  | 'pen:handle'   
  | 'pen:delete'  
  | 'pen:curve';   

//   Pen output mode: what the pen creates  
export type PenOutputMode = 'clip' | 'mask';

 export function shapeTypeOf(tool: ActiveTool): string | null {
  if (tool.startsWith('shape:')) return tool.slice(6);
  return null;
}

export function isShapeTool(tool: ActiveTool): boolean {
  return tool.startsWith('shape:');
}

export function isPenTool(tool: ActiveTool): boolean {
  return tool === 'shape:path';
}

export function isEditTool(tool: ActiveTool): boolean {
  return ['pointer','razor','ripple','slip','hand','selectLeft','selectRight'].includes(tool);
}

export function isCreationTool(tool: ActiveTool): boolean {
  return !isEditTool(tool);
}

// CSS cursor for each tool  
export const TOOL_CURSOR: Record<string, string> = {
  pointer: 'default',
  razor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'><text y=\'16\' font-size=\'16\'>✂</text></svg>") 4 16, crosshair',
  ripple: 'col-resize',
  slip: 'ew-resize',
  hand: 'grab',
  selectLeft: 'w-resize',
  selectRight: 'e-resize',
  text: 'text',
  solid: 'crosshair',
  adjustment: 'crosshair',
  'shape:rect':   'crosshair',
  'shape:circle': 'crosshair',
  'shape:ellipse':'crosshair',
  'shape:star':   'crosshair',
  'shape:polygon':'crosshair',
  'shape:line':   'crosshair',
  'shape:arc': 'crosshair',
  'shape:path':   'crosshair',
};

export const PEN_SUB_CURSOR: Record<PenSubMode, string> = {
  'pen:add':    'crosshair',
  'pen:select': 'default',
  'pen:handle': 'grab',
  'pen:delete': 'not-allowed',
  'pen:curve':  'cell',
};

//   Context  
export interface ToolCtx {
  activeTool: ActiveTool;
  setTool: (t: ActiveTool) => void;
  lastShapeTool: ActiveTool;
  setLastShape:  (t: ActiveTool) => void;
   penSubMode:    PenSubMode;
  setPenSubMode: (m: PenSubMode) => void;
  penOutputMode: PenOutputMode;
  setPenOutputMode: (m: PenOutputMode) => void;
}

export const ToolContext = createContext<ToolCtx>({
  activeTool: 'pointer',
  setTool: () => {},
  lastShapeTool: 'shape:rect',
  setLastShape: () => {},
  penSubMode: 'pen:add',
  setPenSubMode: () => {},
  penOutputMode: 'clip',
  setPenOutputMode: () => {},
});

export function useTool() {
  return useContext(ToolContext);
}
