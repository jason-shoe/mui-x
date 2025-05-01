import { UseChartSeriesSignature } from '../../corePlugins/useChartSeries';
import { ChartPluginSignature } from '../../models';
import { UseChartCartesianAxisSignature, ZoomData } from '../useChartCartesianAxis';

export interface UseChartZoomParameters {
  zoomData?: ZoomData[];
}

export type UseChartZoomDefaultizedParameters = UseChartZoomParameters;

export interface UseChartZoomState {}

export type UseChartZoomSignature = ChartPluginSignature<{
  params: UseChartZoomParameters;
  defaultizedParams: UseChartZoomDefaultizedParameters;
  state: UseChartZoomState;
  dependencies: [UseChartSeriesSignature, UseChartCartesianAxisSignature];
}>;
