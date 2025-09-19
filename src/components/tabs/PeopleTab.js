import React, { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

const HOURS_PER_FTE = 4.33 * 40;

const PeopleTab = ({
  staffMembers,
  staffCategories,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  staffAvailabilityByCategory,
}) => {
  const categorySummary = useMemo(() => {
    const summaries = staffCategories.map((category) => {
      const availability = staffAvailabilityByCategory?.[category.id] || {
        pm: 0,
        design: 0,
        construction: 0,
        total: 0,
      };
      const peopleCount = staffMembers.filter(
        (member) => member.categoryId === category.id
      ).length;

      return {
        id: category.id,
        name: category.name,
        peopleCount,
        pm: availability.pm || 0,
        design: availability.design || 0,
        construction: availability.construction || 0,
        total: availability.total || 0,
        fte: (availability.total || 0) / HOURS_PER_FTE,
      };
    });

    return summaries.filter((summary) => summary.peopleCount > 0 || summary.total > 0);
  }, [staffCategories, staffMembers, staffAvailabilityByCategory]);

  const totalAvailability = useMemo(() => {
    const totals = Object.values(staffAvailabilityByCategory || {}).reduce(
      (acc, availability) => {
        if (!availability) {
          return acc;
        }
        const total = availability.total || 0;
        return {
          hours: acc.hours + total,
          fte: acc.fte + total / HOURS_PER_FTE,
        };
      },
      { hours: 0, fte: 0 }
    );

    return totals;
  }, [staffAvailabilityByCategory]);

  const handleNumberChange = (memberId, field) => (event) => {
    updateStaffMember(memberId, field, event.target.value);
  };

  const handleNameChange = (memberId) => (event) => {
    updateStaffMember(memberId, "name", event.target.value);
  };

  const handleCategoryChange = (memberId) => (event) => {
    updateStaffMember(memberId, "categoryId", event.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">People</h2>
            <p className="text-gray-600">
              Maintain a roster of your actual staff with monthly availability
              across project phases.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Total Actual Availability
              </div>
              <div className="text-2xl font-semibold text-blue-600">
                {totalAvailability.fte.toFixed(2)} FTE
              </div>
              <div className="text-sm text-gray-500">
                {totalAvailability.hours.toFixed(0)} hrs / month
              </div>
            </div>
            <button
              type="button"
              onClick={addStaffMember}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              disabled={staffCategories.length === 0}
              title={
                staffCategories.length === 0
                  ? "Add a staff category before adding people"
                  : "Add staff member"
              }
            >
              <Plus size={16} />
              Add Staff Member
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Team Availability</h3>
          <span className="text-sm text-gray-500">
            Track individual availability by phase (hours per month)
          </span>
        </div>
        {staffMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Category
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    PM Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Design Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Construction Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total FTE
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffMembers.map((member) => {
                  const pm = Number(member.pmAvailability) || 0;
                  const design = Number(member.designAvailability) || 0;
                  const construction = Number(member.constructionAvailability) || 0;
                  const totalHours = pm + design + construction;
                  const totalFte = totalHours / HOURS_PER_FTE;

                  return (
                    <tr key={member.id} className="bg-white hover:bg-gray-50">
                      <td className="p-3 align-top">
                        <input
                          type="text"
                          value={member.name || ""}
                          onChange={handleNameChange(member.id)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Staff name"
                        />
                      </td>
                      <td className="p-3 align-top">
                        <select
                          value={member.categoryId || ""}
                          onChange={handleCategoryChange(member.id)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="" disabled>
                            Select category
                          </option>
                          {staffCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 align-top">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={pm}
                          onChange={handleNumberChange(member.id, "pmAvailability")}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 align-top">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={design}
                          onChange={handleNumberChange(
                            member.id,
                            "designAvailability"
                          )}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 align-top">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={construction}
                          onChange={handleNumberChange(
                            member.id,
                            "constructionAvailability"
                          )}
                          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 align-top text-sm font-semibold text-gray-900">
                        {totalHours.toFixed(1)}
                      </td>
                      <td className="p-3 align-top text-sm font-semibold text-gray-900">
                        {totalFte.toFixed(2)}
                      </td>
                      <td className="p-3 align-top">
                        <button
                          type="button"
                          onClick={() => deleteStaffMember(member.id)}
                          className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-500">
            <p className="text-lg font-medium text-gray-700">
              No staff entered yet
            </p>
            <p className="text-sm">
              Add team members to capture real availability by phase and compare
              it to your allocations.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Availability by Staff Category</h3>
          <span className="text-sm text-gray-500">Aggregated from individual availability</span>
        </div>
        {categorySummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Category
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    People
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    PM Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Design Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Construction Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total Hrs
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total FTE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categorySummary.map((summary) => (
                  <tr key={summary.id} className="bg-white">
                    <td className="p-3 text-sm font-semibold text-gray-900">
                      {summary.name}
                    </td>
                    <td className="p-3 text-sm text-gray-700">
                      {summary.peopleCount}
                    </td>
                    <td className="p-3 text-sm text-gray-700">
                      {summary.pm.toFixed(1)}
                    </td>
                    <td className="p-3 text-sm text-gray-700">
                      {summary.design.toFixed(1)}
                    </td>
                    <td className="p-3 text-sm text-gray-700">
                      {summary.construction.toFixed(1)}
                    </td>
                    <td className="p-3 text-sm font-semibold text-gray-900">
                      {summary.total.toFixed(1)}
                    </td>
                    <td className="p-3 text-sm font-semibold text-gray-900">
                      {summary.fte.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-500">
            Once people are added, their availability will be aggregated by staff
            category here.
          </div>
        )}
      </div>
    </div>
  );
};

export default PeopleTab;
