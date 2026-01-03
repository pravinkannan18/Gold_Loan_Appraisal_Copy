import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function generateAppraiserId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APP-${timestamp}-${random}`;
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-fade-in ${
    type === 'success'
      ? 'bg-green-500'
      : type === 'error'
      ? 'bg-red-500'
      : 'bg-blue-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

export function formatTimestamp(date: Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Guard against invalid dates
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function clearAppraisalData() {
  localStorage.removeItem('currentAppraiser');
  localStorage.removeItem('currentAppraisalId');
  localStorage.removeItem('customerFrontImage');
  localStorage.removeItem('customerSideImage');
  localStorage.removeItem('jewelleryItems');
  localStorage.removeItem('rbiCompliance');
  localStorage.removeItem('purityTest');
}
