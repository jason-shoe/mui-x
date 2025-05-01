// This file should be removed after creating all plugins in favor of a file per chart type.
import { ChartSeriesType } from '../../models/seriesType/config';
import {
  useChartCartesianAxis,
  UseChartCartesianAxisSignature,
} from './featurePlugins/useChartCartesianAxis';
import { useChartHighlight, UseChartHighlightSignature } from './featurePlugins/useChartHighlight';
import {
  useChartInteraction,
  UseChartInteractionSignature,
} from './featurePlugins/useChartInteraction';
import { UseChartPolarAxisSignature } from './featurePlugins/useChartPolarAxis';
import { useChartVoronoi, UseChartVoronoiSignature } from './featurePlugins/useChartVoronoi';
import { useChartZAxis, UseChartZAxisSignature } from './featurePlugins/useChartZAxis';
import { useChartZoom } from './featurePlugins/useChartZoom/useChartZoom';
import { UseChartZoomSignature } from './featurePlugins/useChartZoom/useChartZoom.types';

export type AllPluginSignatures<TSeries extends ChartSeriesType = ChartSeriesType> = [
  UseChartZAxisSignature,
  UseChartCartesianAxisSignature<TSeries>,
  UseChartPolarAxisSignature,
  UseChartInteractionSignature,
  UseChartHighlightSignature,
  UseChartVoronoiSignature,
  UseChartZoomSignature,
];

export const DEFAULT_PLUGINS = [
  useChartZAxis,
  useChartCartesianAxis,
  useChartInteraction,
  useChartHighlight,
  useChartVoronoi,
  useChartZoom,
] as const;
