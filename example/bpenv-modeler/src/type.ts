

import { Feature } from 'ol';
import Geometry from 'ol/geom/Geometry';

export interface Element {
  id: string;
  type: 'place' | 'edge';
  source?: string;
  target?: string;
  attributes: Record<string, string>;
}

export interface Action {
  type: 'add_place' | 'add_edge' | 'delete_place' | 'delete_edge';
  feature: Feature<Geometry>;
}
