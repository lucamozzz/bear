// utils/attributeManager.ts
import Feature from 'ol/Feature.js';
import Geometry from 'ol/geom/Geometry.js';
import { updateSidebarElements } from '../ui/uiState';

export function addAttribute(elementId: string, name: string, value: string): void {
  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;

  if (!polygonManager || !edgeManager) return;

  let feature: Feature<Geometry> | null = null;

  const placeFeatures = polygonManager.getPlaceSource().getFeatures();
  feature = placeFeatures.find((f: any) => f.get('id') === elementId) || null;

  if (!feature) {
    const edgeFeatures = edgeManager.getEdgeSource().getFeatures();
    feature = edgeFeatures.find((f: any) => f.get('id') === elementId) || null;
  }

  if (feature) {
    const attributes = feature.get('attributes') || {};
    attributes[name] = value;
    feature.set('attributes', attributes);
    updateSidebarElements();
  }
}

export function removeAttribute(elementId: string, name: string): void {
  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;

  if (!polygonManager || !edgeManager) return;

  let feature: Feature<Geometry> | null = null;

  const placeFeatures = polygonManager.getPlaceSource().getFeatures();
  feature = placeFeatures.find((f: any) => f.get('id') === elementId) || null;

  if (!feature) {
    const edgeFeatures = edgeManager.getEdgeSource().getFeatures();
    feature = edgeFeatures.find((f: any) => f.get('id') === elementId) || null;
  }

  if (feature) {
    const attributes = feature.get('attributes') || {};
    delete attributes[name];
    feature.set('attributes', attributes);
    updateSidebarElements();
  }
}

export function renameElement(newId: string): void {
  const selectionManager = (window as any).selectionManager;
  if (!selectionManager) return;

  const success = selectionManager.renameSelectedElement(newId);
  if (success) updateSidebarElements();
}
