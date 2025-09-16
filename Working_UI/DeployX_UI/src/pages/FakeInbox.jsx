import { Link } from "react-router-dom";

export default function FakeInbox({ fakeInbox }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-6">📩 Fake Email Inbox</h2>
      {fakeInbox.length === 0 ? (
        <p>No reset emails yet.</p>
      ) : (
        fakeInbox.map((mail, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg mb-4 w-96">
            <p className="mb-2">To: {mail.email}</p>
            <Link
              to={mail.link}
              className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Reset Password
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
