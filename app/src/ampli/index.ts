/**
 * Wrapper for Amplitude analytics
 *
 * This file serves as an entry point that selects the appropriate Amplitude
 * implementation based on the environment.
 */
import {isProduction, isQA} from 'src/utils/environment';

import {ampli as devAmpli} from './dev/gen';
import {ampli as prodAmpli} from './prod/gen';
import {ampli as qaAmpli} from './qa/gen';

export const ampli = isProduction() ? prodAmpli : isQA() ? qaAmpli : devAmpli;
export * from './dev/gen';
