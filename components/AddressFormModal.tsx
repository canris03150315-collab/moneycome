import React, { useState, useEffect } from 'react';
import type { ShippingAddress } from '../types';
import { XCircleIcon } from './icons';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Omit<ShippingAddress, 'id' | 'isDefault'>, id?: string) => void;
  addressToEdit?: ShippingAddress | null;
}

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  addressToEdit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        setName(addressToEdit.name);
        setPhone(addressToEdit.phone);
        setAddress(addressToEdit.address);
      } else {
        setName('');
        setPhone('');
        setAddress('');
      }
    }
  }, [isOpen, addressToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, phone, address }, addressToEdit?.id);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-slate-50 rounded-2xl shadow-2xl p-6 sm:p-8 m-4 max-w-lg w-full transform transition-all duration-300 scale-95 animate-modal-pop"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {addressToEdit ? '編輯地址' : '新增地址'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">收件人姓名</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">聯絡電話</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">完整地址</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg text-white bg-black hover:bg-gray-800 font-semibold shadow-md transition-colors"
            >
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};