import {
  boolean,
} from 'boolean';
import {
  format as formatNumber,
} from 'mathjs';
import Roarr from 'roarr';
import {
  tokenize,
} from './tokenize';
import {
  Token,
  PlaceholderToken,
  Flag,
} from './types';

const log = Roarr.child({
  package: 'fast-printf',
});

type FormatUnboundExpression = (
  subject: string,
  token: PlaceholderToken,
  boundValues: any[],
) => string;

const formatDefaultUnboundExpression = (
  subject: string,
  token: PlaceholderToken,
  boundValues: any[],
): string => {
  log.warn({
    boundValues,
    position: token.position,
    subject,
  }, 'referenced unbound value');

  return token.placeholder;
};

type Configuration = {
  formatUnboundExpression: FormatUnboundExpression,
};

export const createPrintf = (configuration?: Configuration) => {
  const padValue = (value: string, width: number, flag: Flag | null): string => {
    if (flag === '-') {
      return value.padEnd(width, ' ');
    } else if (flag === '-+') {
      return ((Number(value) >= 0 ? '+' : '') + value).padEnd(width, ' ');
    } else if (flag === '+') {
      return ((Number(value) >= 0 ? '+' : '') + value).padStart(width, ' ');
    } else if (flag === '0') {
      return value.padStart(width, '0');
    } else {
      return value.padStart(width, ' ');
    }
  };

  const formatUnboundExpression = configuration?.formatUnboundExpression ?? formatDefaultUnboundExpression;

  const cache: Record<string, Token[]> = {};

  // eslint-disable-next-line complexity
  return (subject: string, ...boundValues: any[]): string => {
    let tokens = cache[subject];

    if (!tokens) {
      tokens = cache[subject] = tokenize(subject);
    }

    let result = '';

    for (const token of tokens) {
      if (token.type === 'literal') {
        result += token.literal;
      } else {
        let boundValue = boundValues[token.position];

        if (boundValue === undefined) {
          result += formatUnboundExpression(
            subject,
            token,
            boundValues,
          );
        } else if (token.conversion === 'b') {
          result += boolean(boundValue) ? 'true' : 'false';
        } else if (token.conversion === 'B') {
          result += boolean(boundValue) ? 'TRUE' : 'FALSE';
        } else if (token.conversion === 'c') {
          result += boundValue;
        } else if (token.conversion === 'C') {
          result += String(boundValue).toUpperCase();
        } else if (token.conversion === 'd') {
          boundValue = String(Math.trunc(boundValue));

          if (token.width !== null) {
            boundValue = padValue(
              boundValue,
              token.width,
              token.flag,
            );
          }

          result += boundValue;
        } else if (token.conversion === 'e') {
          result += formatNumber(
            boundValue,
            {
              notation: 'exponential',
            },
          );
        } else if (token.conversion === 'E') {
          result += formatNumber(
            boundValue,
            {
              notation: 'exponential',
            },
          ).toUpperCase();
        } else if (token.conversion === 'f') {
          if (token.precision !== null) {
            boundValue = formatNumber(
              boundValue,
              {
                notation: 'fixed',
                precision: token.precision,
              },
            );
          }

          if (token.width !== null) {
            boundValue = padValue(
              String(boundValue),
              token.width,
              token.flag,
            );
          }

          result += boundValue;
        } else if (token.conversion === 'i') {
          result += boundValue;
        } else if (token.conversion === 'o') {
          result += (Number.parseInt(String(boundValue), 10) >>> 0).toString(8);
        } else if (token.conversion === 's') {
          if (token.width !== null) {
            boundValue = padValue(
              String(boundValue),
              token.width,
              token.flag,
            );
          }

          result += boundValue;
        } else if (token.conversion === 'S') {
          if (token.width !== null) {
            boundValue = padValue(
              String(boundValue),
              token.width,
              token.flag,
            );
          }

          result += String(boundValue).toUpperCase();
        } else if (token.conversion === 'u') {
          result += Number.parseInt(String(boundValue), 10) >>> 0;
        } else if (token.conversion === 'x') {
          boundValue = (Number.parseInt(String(boundValue), 10) >>> 0).toString(16);

          if (token.width !== null) {
            boundValue = padValue(
              String(boundValue),
              token.width,
              token.flag,
            );
          }

          result += boundValue;
        } else {
          throw new Error('Unknown format specifier.');
        }
      }
    }

    return result;
  };
};
