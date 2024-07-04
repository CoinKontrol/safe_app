import { Listbox } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';

const options = [
  { id: 1, address: "0x912CE59144191C1204E64559FE8253a0e49E6548", name: 'ARB' },
  { id: 2, address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", name: 'USDC' },
  { id: 3, address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", name: 'USDC.e' },
  { id: 4, address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", name: 'WBTC' },
];

export default function MultiSelect( { selectedOptions, setSelectedOptions, callback }) {
  const handleSelect = (option) => {
    setSelectedOptions(option)
    callback(option)
  }

  return (
    <div className="w-72">
      <Listbox value={selectedOptions} onChange={handleSelect} multiple>
        <Listbox.Button className="w-full bg-white border border-gray-300 rounded-md py-2 px-4 text-left mt-2">
          {selectedOptions.length === 0 
            ? 'Select tokens' 
            : `${selectedOptions.length} selected`}
        </Listbox.Button>
        <Listbox.Options className="absolute mt-14 w-72 bg-white border border-gray-300 rounded-md">
          {options.map((option) => (
            <Listbox.Option
              key={option.address}
              value={option}
              className={({ active, selected }) =>
                `cursor-pointer select-none py-2 px-4 ${
                  active ? 'bg-blue-100' : ''
                } ${selected ? 'bg-blue-200' : ''}`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`${selected ? 'font-medium' : 'font-normal'}`} key={selected}>
                    {option.name}
                  </span>
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>

      {selectedOptions && selectedOptions.length > 0 && <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Selected Tokens:</h3>
        <ul className="list-disc pl-5 text-sm">
          {selectedOptions.map((option) => (
            <li key={option.id}>{option.name}</li>
          ))}
        </ul>
      </div>
      }
    </div>
  );
}
