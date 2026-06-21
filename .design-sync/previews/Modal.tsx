import { Modal, PrimaryButton, SecondaryButton } from 'resumegen';

export function Confirmation() {
  return (
    <Modal show={true} onClose={() => {}}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Delete Resume</h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete this resume? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton>Cancel</SecondaryButton>
          <button className="inline-flex items-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function FormModal() {
  return (
    <Modal show={true} onClose={() => {}}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Share Resume</h3>
        <p className="mt-1 text-sm text-gray-500">Get a shareable link for your resume.</p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Public link</label>
          <input
            type="text"
            readOnly
            value="https://resumegen.app/share/abc123"
            className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm"
          />
        </div>
        <div className="mt-6 flex justify-end">
          <PrimaryButton>Copy Link</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
