"use client";
import React from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

export default function ModalBasedAlerts() {
  const successModal = useModal();
  const infoModal = useModal();
  const warningModal = useModal();
  const errorModal = useModal();
  return (
    <ComponentCard title="Modal Based Alerts">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={successModal.openModal}
          className="px-4 py-3 text-sm font-medium text-white rounded-lg bg-success-500 shadow-theme-xs hover:bg-success-600"
        >
          Success Alert
        </button>
        <button
          onClick={infoModal.openModal}
          className="px-4 py-3 text-sm font-medium text-white rounded-lg bg-blue-light-500 shadow-theme-xs hover:bg-blue-light-600"
        >
          Info Alert
        </button>
        <button
          onClick={warningModal.openModal}
          className="px-4 py-3 text-sm font-medium text-white rounded-lg bg-warning-500 shadow-theme-xs hover:bg-warning-600"
        >
          Warning Alert
        </button>
        <button
          onClick={errorModal.openModal}
          className="px-4 py-3 text-sm font-medium text-white rounded-lg bg-error-500 shadow-theme-xs hover:bg-error-600"
        >
          Danger Alert
        </button>
      </div>
      <Modal
        isOpen={successModal.isOpen}
        onClose={successModal.closeModal}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <div className="text-center">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
            Well Done!
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Operación completada con éxito.
          </p>
          <div className="flex items-center justify-center w-full gap-3 mt-7">
            <button
              type="button"
              onClick={successModal.closeModal}
              className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-success-500 shadow-theme-xs hover:bg-success-600 sm:w-auto"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={infoModal.isOpen}
        onClose={infoModal.closeModal}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <div className="text-center">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
            Information Alert!
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Aquí va información relevante para el usuario.
          </p>
          <div className="flex items-center justify-center w-full gap-3 mt-7">
            <button
              type="button"
              onClick={infoModal.closeModal}
              className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-blue-light-500 shadow-theme-xs hover:bg-blue-light-600 sm:w-auto"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={warningModal.isOpen}
        onClose={warningModal.closeModal}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <div className="text-center">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
            Warning Alert!
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Esta acción requiere atención antes de continuar.
          </p>
          <div className="flex items-center justify-center w-full gap-3 mt-7">
            <button
              type="button"
              onClick={warningModal.closeModal}
              className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-warning-500 shadow-theme-xs hover:bg-warning-600 sm:w-auto"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={errorModal.isOpen}
        onClose={errorModal.closeModal}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <div className="text-center">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
            Danger Alert!
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Ocurrió un error. Intenta de nuevo o contacta a soporte.
          </p>
          <div className="flex items-center justify-center w-full gap-3 mt-7">
            <button
              type="button"
              onClick={errorModal.closeModal}
              className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-error-500 shadow-theme-xs hover:bg-error-600 sm:w-auto"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      </Modal>
    </ComponentCard>
  );
}
