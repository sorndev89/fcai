declare module 'cleave.js' {
  interface CleaveOptions {
    numeral?: boolean;
    numeralThousandsGroupStyle?: 'thousand' | 'lakh' | 'wan';
    numeralDecimalScale?: number;
    numeralPositiveOnly?: boolean;
    numeralDecimalMark?: string;
    delimiter?: string;
    delimiters?: string[];
    blocks?: number[];
    prefix?: string;
    rawValueTrimPrefix?: boolean;
    creditCard?: boolean;
    phone?: boolean;
    phoneRegionCode?: string;
    date?: boolean;
    datePattern?: string[];
    uppercase?: boolean;
    lowercase?: boolean;
    onValueChanged?: (e: { target: { rawValue: string } }) => void;
  }

  class Cleave {
    constructor(selector: string | HTMLElement, options: CleaveOptions);
    getRawValue(): string;
    setRawValue(value: string): void;
    getFormattedValue(): string;
    destroy(): void;
    setPhoneRegionCode(regionCode: string): void;
  }

  export default Cleave;
}
