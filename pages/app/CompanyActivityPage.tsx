import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { PAGES } from "../../config/permissions";
import { ActivityLogger } from "../../services/activityLogger";
import { db } from "../../services/firebase";
import type { Activity, ActivityType, CompanyUser } from "../../types";
import Spinner from "../../components/Spinner";

const CompanyActivityPage: React.FC = () => {
  usePageTitle("Company Activity");
  const { user, userProfile } = useAuth();
  const { hasPageAccess, isOwner, isAdmin } = usePermissions();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const loadData = async () => {
    if (!user || !userProfile) return;

    setLoading(true);
    try {
      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;

      if (!companyId) {
        console.error("Company ID not found");
        return;
      }

      // Load company activities and all users (including newly created)
      const [companyActivities, usersSnapshot] = await Promise.all([
        ActivityLogger.getCompanyActivities(companyId, 200),
        // Get all users for this company from main users collection
        db.collection("users").where("companyId", "==", companyId).get(),
      ]);

      // Also get owner user
      const ownerDoc = await db.collection("users").doc(companyId).get();

      const companyUsers: CompanyUser[] = [];

      // Add owner
      if (ownerDoc.exists) {
        const ownerData = ownerDoc.data();
        companyUsers.push({
          id: ownerDoc.id,
          uid: ownerDoc.id,
          email: ownerData?.email || "",
          displayName:
            ownerData?.displayName || ownerData?.companyName || "Owner",
          role: "owner" as any,
          permissions: [],
          isActive: true,
          createdAt: ownerData?.createdAt,
          invitedBy: "",
          companyId: companyId,
        });
      }

      // Add other company users
      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        companyUsers.push({
          id: doc.id,
          uid: doc.id,
          email: userData.email || "",
          displayName: userData.displayName || userData.companyName || "User",
          role: userData.role || "viewer",
          permissions: userData.permissions || [],
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt,
          invitedBy: userData.invitedBy || "",
          companyId: companyId,
        });
      });

      setActivities(companyActivities);
      setFilteredActivities(companyActivities);
      setUsers(companyUsers);
    } catch (error) {
      console.error("Error loading company activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, userProfile]);

  useEffect(() => {
    let filtered = [...activities];

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((activity) =>
        activity.type.includes(typeFilter),
      );
    }

    // User filter
    if (userFilter !== "all") {
      filtered = filtered.filter((activity) => activity.userId === userFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(
        (activity) => activity.timestamp.toDate() >= filterDate,
      );
    }

    setFilteredActivities(filtered);
  }, [activities, typeFilter, userFilter, dateFilter]);

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
    }
  };

  // Get user activity stats
  const getUserStats = () => {
    const userStats = users.map((user) => {
      const userActivities = activities.filter((a) => a.userId === user.uid);
      const todayActivities = userActivities.filter((a) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return a.timestamp.toDate() >= today;
      });
      const weekActivities = userActivities.filter((a) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return a.timestamp.toDate() >= weekAgo;
      });

      return {
        user,
        total: userActivities.length,
        today: todayActivities.length,
        week: weekActivities.length,
        lastActivity:
          userActivities.length > 0 ? userActivities[0].timestamp : null,
      };
    });

    return userStats.sort((a, b) => b.total - a.total);
  };

  if (!hasPageAccess(PAGES.DASHBOARD) || (!isOwner && !isAdmin)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to view company activity.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  const activityTypes = [
    "all",
    "invoice",
    "customer",
    "product",
    "bank_account",
    "expense",
    "user",
    "login",
    "logout",
  ];
  const userStats = getUserStats();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Company Activity
        </h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Activity Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all"
                    ? "All Activities"
                    : type
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.displayName} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
          <h3 className="text-sm font-medium">Total Activities</h3>
          <p className="text-2xl font-bold">{activities.length}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
          <h3 className="text-sm font-medium">This Week</h3>
          <p className="text-2xl font-bold">
            {
              activities.filter((a) => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return a.timestamp.toDate() >= weekAgo;
              }).length
            }
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
          <h3 className="text-sm font-medium">Today</h3>
          <p className="text-2xl font-bold">
            {
              activities.filter((a) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return a.timestamp.toDate() >= today;
              }).length
            }
          </p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-lg text-white">
          <h3 className="text-sm font-medium">Active Users</h3>
          <p className="text-2xl font-bold">
            {
              new Set(
                activities
                  .filter((a) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return a.timestamp.toDate() >= today;
                  })
                  .map((a) => a.userId),
              ).size
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Activity Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              User Activity Stats
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {userStats.slice(0, 10).map((stat) => (
                <div
                  key={stat.user.uid}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.total} total
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.today} today, {stat.week} this week
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Activity Timeline ({filteredActivities.length} activities)
            </h2>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-600 dark:text-gray-300">
                No activities found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredActivities.slice(0, 50).map((activity) => (
                  <div
                    key={activity.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-xl">
                          {ActivityLogger.getActivityIcon(activity.type)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium ${ActivityLogger.getActivityColor(activity.type)}`}
                          >
                            {activity.description}
                          </p>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {activity.type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            by {activity.userName}
                          </span>
                          {activity.metadata?.entityId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {activity.metadata.entityId.substring(0, 8)}
                              ...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyActivityPage;
