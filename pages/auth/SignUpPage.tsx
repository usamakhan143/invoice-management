import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { usePageTitle } from "../../hooks/usePageTitle";
import { BRAND_LOGO_ALT, BRAND_LOGO_DARK } from "../../config/brand";

const SignUpPage: React.FC = () => {
  usePageTitle("Sign Up");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { user } = await auth.createUserWithEmailAndPassword(
        email,
        password,
      );
      if (user) {
        // Create a user document in Firestore as company owner
        await db.collection("users").doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          companyName: companyName,
          createdAt: new Date(),
          invoiceCounter: 0,
          role: "owner",
          isOwner: true,
          companyId: user.uid, // Owner's company ID is their own UID
          isActive: true,
        });

        // Also create company owner entry in companyUsers collection for consistency
        await db.collection("companyUsers").add({
          uid: user.uid,
          email: user.email,
          displayName: companyName + " Owner",
          role: "owner",
          permissions: [], // Will use default owner permissions
          isActive: true,
          companyId: user.uid,
          invitedBy: user.uid,
          createdAt: new Date(),
        });

        navigate("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="flex flex-col items-center gap-4">
        <img
          src={BRAND_LOGO_DARK}
          alt={BRAND_LOGO_ALT}
          className="h-10 w-auto max-w-[240px] object-contain"
        />
        <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
          Create your account
        </h1>
      </div>
      <form className="space-y-6" onSubmit={handleSignUp}>
        {error && (
          <p className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor="companyName"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Company Name
          </label>
          <input
            type="text"
            name="companyName"
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            placeholder="Your Company Inc."
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Your email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            placeholder="name@company.com"
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-sm font-light text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:underline dark:text-primary-500"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignUpPage;
