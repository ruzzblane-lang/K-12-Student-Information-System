import React from 'react';
import { Link } from 'react-router-dom';

const StudentCard = ({ _student, onEdit, onDelete }) => {
  const { _id, student_id, User, status, enrollment_date } = _student;
  const { first_name, last_name, email, phone } = User || {};

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {first_name} {last_name}
          </h3>
          <p className="text-sm text-gray-600">ID: {student_id}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Email:</span> {email}
        </p>
        {phone && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Phone:</span> {phone}
          </p>
        )}
        <p className="text-sm text-gray-600">
          <span className="font-medium">Enrolled:</span> {new Date(enrollment_date).toLocaleDateString()}
        </p>
      </div>

      <div className="flex space-x-2">
        <Link
          to={`/students/${_id}`}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors text-center"
        >
          View Details
        </Link>
        <button
          onClick={() => onEdit(_student)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(_id)}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default StudentCard;
