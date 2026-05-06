import React from 'react';

type Props = {
  value?: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
};

const JoditEditorComponent: React.FC<Props> = ({ value = '', onChange }) => {
  return (
    <textarea
      className="w-full p-2 border rounded"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};

export default JoditEditorComponent;

