'use client';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { ClipboardIcon } from '@heroicons/react/24/outline';

interface EmbedCodeModalProps {
  showEmbedModal: boolean;
  setShowEmbedModal: (value: boolean) => void;
  embedCode: string;
}

export default function EmbedCodeModal({ showEmbedModal, setShowEmbedModal, embedCode }: EmbedCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Transition.Root show={showEmbedModal} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setShowEmbedModal(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right w-full">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                        کد تعبیه ویجت چت
                      </Dialog.Title>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          برای افزودن ویجت چت به وب‌سایت خود، کد زیر را کپی کرده و در بخش <code>&lt;body&gt;</code> صفحه وب‌سایت خود قرار دهید:
                        </p>
                        <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                          {embedCode}
                        </pre>
                        <button
                          onClick={copyToClipboard}
                          className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ClipboardIcon className="w-5 h-5 ml-2" />
                          {copied ? 'کپی شد!' : 'کپی کد'}
                        </button>
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                          <h4 className="font-semibold">راهنمای استفاده:</h4>
                          <ol className="list-decimal mr-4 mt-2">
                            <li>کد بالا را کپی کنید.</li>
                            <li>فایل HTML صفحه وب‌سایت خود را باز کنید.</li>
                            <li>کد را در بخش <code>&lt;body&gt;</code>، ترجیحاً قبل از تگ بسته <code>&lt;/body&gt;</code> قرار دهید.</li>
                            <li>فایل را ذخیره کرده و وب‌سایت خود را بارگذاری کنید.</li>
                            <li>ویجت چت باید در گوشه پایین-راست صفحه ظاهر شود.</li>
                          </ol>
                          <p className="mt-2">
                            <strong>نکته:</strong> مطمئن شوید که وب‌سایت شما از پروتکل HTTPS استفاده می‌کند تا ویجت به درستی کار کند.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:mr-3 sm:w-auto"
                    onClick={() => setShowEmbedModal(false)}
                  >
                    بستن
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}