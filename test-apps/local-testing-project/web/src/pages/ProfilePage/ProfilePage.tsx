import { Metadata } from "src/lib/Metadata";

import { useAuth } from "src/auth";
// import { Link, routes } from '@rwgql/router'

const ProfilePage = () => {
  const { currentUser, isAuthenticated, hasRole, loading } = useAuth();

  if (loading || !currentUser) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <Metadata title="Profile" description="Profile page" og />

      <h1 className="text-2xl">Profile</h1>

      <table className="rw-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ID</td>
            <td>{String(currentUser.id)}</td>
          </tr>
          <tr>
            <td>ROLES</td>
            <td>{JSON.stringify(currentUser.roles ?? "")}</td>
          </tr>
          <tr>
            <td>EMAIL</td>
            <td>{String(currentUser.email)}</td>
          </tr>

          <tr key="isAuthenticated">
            <td>isAuthenticated</td>
            <td>{JSON.stringify(isAuthenticated)}</td>
          </tr>

          <tr key="hasRole">
            <td>Is Admin</td>
            <td>{JSON.stringify(hasRole("ADMIN"))}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default ProfilePage;
