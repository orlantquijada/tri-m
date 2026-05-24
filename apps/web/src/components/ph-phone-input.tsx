import * as React from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatPhMobileNational, toNationalPhDigits } from "@/lib/phone";

type Props = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "onChange" | "type" | "value"
> & {
  onChange: (localDigits: string) => void;
  value: string;
};

export function PhPhoneInput({ onChange, value, className, ...rest }: Props) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">
        <InputGroupText>+63</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        autoComplete="tel-national"
        inputMode="numeric"
        maxLength={12}
        placeholder="917 123 4567"
        type="tel"
        value={formatPhMobileNational(value)}
        onChange={(e) => {
          const national = toNationalPhDigits(e.target.value);
          onChange(national ? `0${national}` : "");
        }}
        {...rest}
      />
    </InputGroup>
  );
}
