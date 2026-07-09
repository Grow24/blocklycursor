import * as Blockly from 'blockly';
import '@blockly/toolbox-search';
import { Backpack } from '@blockly/workspace-backpack';
import { WorkspaceSearch } from '@blockly/plugin-workspace-search';
import { ZoomToFitControl } from '@blockly/zoom-to-fit';
import { PositionedMinimap } from '@blockly/workspace-minimap';
import Theme from '@blockly/theme-highcontrast';
import { registerPbmpBlocks } from '../blocks/pbmp-blocks.js';
import { toolbox } from './toolbox.js';

export function initWorkspace(containerId) {
  registerPbmpBlocks();

  const workspace = Blockly.inject(containerId, {
    toolbox,
    theme: Theme,
    grid: {
      spacing: 20,
      length: 3,
      colour: '#ccc',
      snap: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    },
    trashcan: true,
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
  });

  const backpack = new Backpack(workspace, {
    allowEmptyBackpackOpen: true,
    useFilledBackpackImage: true,
  });
  backpack.init();

  const workspaceSearch = new WorkspaceSearch(workspace);
  workspaceSearch.init();
  workspaceSearch.setSearchPlaceholder('Search blocks (approval, invoice, task...)');

  const zoomToFit = new ZoomToFitControl(workspace);
  zoomToFit.init();

  const minimap = new PositionedMinimap(workspace);
  minimap.init();

  return workspace;
}
