"use client";
import { useEffect, useMemo } from "react";
import countryFlags from "@/lib/config/countryFlags.json";
import dialCodeCountries from "@/lib/config/dialCodeCountries.json";
import countryNames from "@/lib/config/countryNames.json";

const uae = {
  code: "AE",
  dial_code: "+971",
  flag: countryFlags["AE"],
  name: countryNames["AE"],
};

export default function PhoneNumberInput({
  name,
  value = "",
  onChange: onChangeProp,
  isDisabled,
  classNames = { inputWrapper: "", countryIcon: "", input: "" },
}) {
  const [country, formatted] = useMemo(() => {
    const toCheck = value.split(" ").join("");
    if (!toCheck.startsWith("+") && toCheck.length > 0)
      return [uae, "+971 " + value];
    else if (toCheck.length === 0) return [null, ""];
    const max = Math.min(6, toCheck.length);
    let countryCode;
    for (let i = 1; i <= max; i++) {
      const text = toCheck.substring(0, i);
      countryCode = dialCodeCountries[text];
      if (countryCode) {
        const countryData = {
          code: countryCode,
          dial_code: text,
          flag: countryFlags[countryCode],
          name: countryNames[countryCode],
        };
        const restText = toCheck.substring(i);
        if (restText.length > 0) {
          if (restText.length > 7)
            return [
              countryData,
              `${countryData.dial_code} ${restText.substring(0, restText.length - 7)} ${restText.substring(restText.length - 7, restText.length - 4)} ${restText.substring(restText.length - 4)}`,
            ];
          else if (restText.length > 4)
            return [
              countryData,
              `${countryData.dial_code} ${restText.substring(0, restText.length - 4)} ${restText.substring(restText.length - 4)}`,
            ];
          else return [countryData, `${countryData.dial_code} ${restText}`];
        } else return [countryData, `${countryData.dial_code}${restText}`];
      }
    }
    return [null, value];
  }, [value]);
  const onChange = (e) => {
    if (onChangeProp) onChangeProp(e.target.value);
  };
  return (
    <div className={`${classNames.inputWrapper}`}>
      <div
        className={`${country?.disabled ? "opacity-20" : "opacity-60"} py-2 pl-0 pr-2 ${classNames.countryIcon}`}
        title={country?.name}
      >
        {country ? <span>{country.flag}</span> : null}
      </div>
      <input
        type="tel"
        name={name}
        value={formatted}
        placeholder="+971"
        className={`${classNames.input}`}
        onChange={onChange}
      />
    </div>
  );
}
