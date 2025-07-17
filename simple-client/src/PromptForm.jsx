import React, { useState } from 'react';

export default function PromptForm({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const handle = (e) => {
    e.preventDefault();
    onSubmit(value);
  };
  return (
    <form onSubmit={handle} className="flex">
      <input
        className="flex-1 p-2 rounded-l bg-gray-800 text-white"
        placeholder="Describe your playlist..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 bg-green-500 text-white rounded-r disabled:opacity-50"
      >
        {loading ? '...' : 'Generate'}
      </button>
    </form>
  );
}
