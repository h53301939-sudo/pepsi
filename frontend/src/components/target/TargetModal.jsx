import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import API from '../../services/api';
import { Target as TargetIcon, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function TargetModal({ isOpen, onClose, currentTarget, onTargetSaved }) {
  const [targetCases, setTargetCases] = useState(5000);
  const [targetRevenue, setTargetRevenue] = useState(2500000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentTarget) {
      setTargetCases(currentTarget.targetCases || 5000);
      setTargetRevenue(currentTarget.targetRevenue || 2500000);
    }
  }, [currentTarget, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await API.post('/targets', {
        targetCases: Number(targetCases),
        targetRevenue: Number(targetRevenue)
      });
      if (onTargetSaved) onTargetSaved();
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save sales target');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Monthly Sales Target" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/30 text-pepsi-blue dark:text-blue-300 rounded-xl">
          <TargetIcon className="w-6 h-6 flex-shrink-0" />
          <div>
            <h4 className="font-extrabold text-sm">Monthly Goal Setting</h4>
            <p className="text-[11px] opacity-80">
              Set target volume (cases) & revenue goals for the current month.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Target Volume (Total Cases)
          </label>
          <div className="relative">
            <input
              type="number"
              min="100"
              step="50"
              value={targetCases}
              onChange={(e) => setTargetCases(e.target.value)}
              required
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-white text-sm"
              placeholder="e.g. 5000"
            />
            <span className="absolute right-3 top-3 text-[11px] font-bold text-slate-400">Cases</span>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Target Revenue (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              min="1000"
              step="10000"
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(e.target.value)}
              required
              className="w-full p-2.5 pl-7 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl font-black text-slate-900 dark:text-white text-sm"
              placeholder="e.g. 2500000"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-pepsi-blue text-white font-extrabold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2 shadow-md mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>SAVING TARGET...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Save Monthly Sales Target</span>
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
