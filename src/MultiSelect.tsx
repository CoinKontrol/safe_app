import React, { useState, useEffect } from 'react';
import { Listbox } from '@headlessui/react';
import Select from "react-tailwindcss-select";
import tokens from './data/tokens.json';

export default function MultiSelect( { selectedOptions, setSelectedOptions, callback }) {
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);

  const handleSelect = (option) => {
    setSelected(option)
    setSelectedOptions(option)
    callback(option)
  }

  useEffect(() => {
    const options = tokens.map((token) => {
        return {
            value: token.address,
            label: token.symbol,
        }
    })

    setOptions(options)
  }, [])

  return <Select
        value={selected}
        isMultiple={true}
        isSearchable={true}
        onChange={handleSelect}
        primaryColor="indigo" as any
        options={options}
    />
}
