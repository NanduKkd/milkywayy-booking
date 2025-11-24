'use client';
import { useState, useEffect } from 'react';
import countryFlags from '@/lib/config/countryFlags.json';
import dialCodeCountries from '@/lib/config/dialCodeCountries.json';
import countryNames from '@/lib/config/countryNames.json';

const uae = { code: 'AE', dial_code: '+971', flag: countryFlags['AE'], name: countryNames['AE'] };

export default function PhoneNumberInput({ name, onChange: onChangeProp, isDisabled, classNames={inputWrapper: '', countryIcon: '', input: ''} }) {
  const [ country, setCountry ] = useState(uae);
  const onChange = (e) => {
    if(!e.target.value.startsWith('+')) {
      setCountry(uae);
    } else {
      const max = Math.min(6, e.target.value.length);
      let countryCode;
      for(let i=1; i<=max; i++) {
        const text = e.target.value.substring(0, i);
        countryCode = dialCodeCountries[text];
        if(countryCode) {
          setCountry({ code: countryCode, dial_code: text, flag: countryFlags[countryCode], name: countryNames[countryCode] });
          break;
        }
      }
      if(!countryCode)
        setCountry(c => ({...c, disabled: true}))
    }
    if(onChangeProp) onChangeProp(e.target.value);
  }
  return (
    <div className={`${classNames.inputWrapper}`}>
      <div className={`${country?.disabled ? 'opacity-20' : 'opacity-60'} py-2 pl-0 pr-2 ${classNames.countryIcon}`} title={country?.name}>
        {country? (
          <span>{country.flag}</span>
        ): null}
      </div>
      <input placeholder="+971" className={`${classNames.input}`} onChange={onChange} />
    </div>
  )
}
