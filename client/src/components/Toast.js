import React, { useEffect, useState } from 'react';

let notify = null;

export function showToast(message, type = 'success') {
  notify?.({ message, type });
}

export default function ToastContainer() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    notify = (t) => {
      setToast(t);
      setTimeout(() => setToast(null), 3200);
    };
    return () => { notify = null; };
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`} role="status">
      {toast.message}
    </div>
  );
}
