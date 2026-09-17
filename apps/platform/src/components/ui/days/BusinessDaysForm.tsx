import type { LocationJson } from "@/types/types";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type Hour = {
  id?: string;
  openTime: string;
  closeTime: string;
  title: string;
  note: string;
};

export type DayHours = {
  id: string;
  isClosed: boolean;
  originalIsClosed: boolean;
  hour: Hour | null;
  specialHours: Hour[];
};

type BusinessDaysFormProps = {
  locationData: LocationJson;
  days: Record<DayOfWeek, DayHours>;
  canManage: boolean;
  isSaving: boolean;
  canSubmit: boolean;
  errorMessage: string | null;
  applyToSynced: boolean;
  setApplyToSynced: Dispatch<SetStateAction<boolean>>;
  setDays: Dispatch<SetStateAction<Record<DayOfWeek, DayHours> | null>>;
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  updateRegularHour(
    day: DayOfWeek,
    field: "openTime" | "closeTime",
    value: string,
  ): void;
  addSpecialHour(day: DayOfWeek): void;
  updateSpecialHour(
    day: DayOfWeek,
    hourIdx: number,
    field: keyof Omit<Hour, "id">,
    value: string,
  ): void;
  removeSpecialHour(day: DayOfWeek, hourIdx: number): Promise<void>;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2";

const labelClass = "text-xs font-medium text-gray-600";

export default function BusinessDaysForm({
  locationData,
  days,
  canManage,
  isSaving,
  canSubmit,
  errorMessage,
  applyToSynced,
  setApplyToSynced,
  setDays,
  handleSubmit,
  updateRegularHour,
  addSpecialHour,
  updateSpecialHour,
  removeSpecialHour,
}: BusinessDaysFormProps) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm pt-4"
      onSubmit={handleSubmit}
    >
      <fieldset className="px-5">
        <legend className="text-base font-semibold text-gray-900">
          Business Schedule
        </legend>

        <p className="text-sm text-gray-600">
          {canManage
            ? "Set the regular opening and closing time for each day. Special hours can be added separately when this location operates outside of its normal schedule."
            : "View the days the business is open as well as their open and close hours."}
        </p>

        <div className="mt-5 space-y-4">
          {locationData.days.map((locationDay) => {
            const day = locationDay.dayOfWeek as DayOfWeek;
            const currentDay = days[day];

            return (
              <div
                key={currentDay.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {/* Day heading */}
                <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3">
                  <span className="font-semibold text-gray-900">{day}</span>

                  {canManage ? (
                    <label
                      htmlFor={`${day}-isClosed`}
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <input
                        id={`${day}-isClosed`}
                        name={`${day}-isClosed`}
                        type="checkbox"
                        checked={currentDay.isClosed}
                        onChange={(event) => {
                          setDays((currentDays) => {
                            if (!currentDays) return currentDays;

                            return {
                              ...currentDays,
                              [day]: {
                                ...currentDays[day],
                                isClosed: event.target.checked,
                              },
                            };
                          });
                        }}
                      />
                      Closed
                    </label>
                  ) : (
                    <span className="text-sm text-gray-600">
                      {currentDay.isClosed ? "Closed" : "Open"}
                    </span>
                  )}
                </div>

                {!currentDay.isClosed && (
                  <div className="space-y-5 px-4 py-4">
                    {/* Regular hours */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">
                        Regular Hours
                      </h3>

                      {canManage && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Set the normal opening and closing time for this day.
                        </p>
                      )}

                      {canManage ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`${day}-openTime`}
                              className={labelClass}
                            >
                              Open
                            </label>
                            <input
                              id={`${day}-openTime`}
                              type="time"
                              className={inputClass}
                              value={currentDay.hour?.openTime ?? ""}
                              onChange={(event) =>
                                updateRegularHour(
                                  day,
                                  "openTime",
                                  event.target.value,
                                )
                              }
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`${day}-closeTime`}
                              className={labelClass}
                            >
                              Close
                            </label>
                            <input
                              id={`${day}-closeTime`}
                              type="time"
                              className={inputClass}
                              value={currentDay.hour?.closeTime ?? ""}
                              onChange={(event) =>
                                updateRegularHour(
                                  day,
                                  "closeTime",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className={labelClass}>Open</p>
                            <p className="mt-1 text-gray-700">
                              {currentDay.hour?.openTime || "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className={labelClass}>Close</p>
                            <p className="mt-1 text-gray-700">
                              {currentDay.hour?.closeTime || "Not set"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Special hours */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700">
                            Special Hours
                          </h3>
                          {canManage && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              Add operating hours for this day.
                            </p>
                          )}
                        </div>

                        {canManage && (
                          <button
                            type="button"
                            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                            onClick={() => addSpecialHour(day)}
                          >
                            Add Another
                          </button>
                        )}
                      </div>

                      {currentDay.specialHours.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {currentDay.specialHours.map(
                            (specialHour, hourIdx) => (
                              <div
                                key={specialHour.id ?? hourIdx}
                                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                              >
                                {canManage ? (
                                  <>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label
                                          htmlFor={`${day}-${hourIdx}-special-openTime`}
                                          className={labelClass}
                                        >
                                          Open
                                        </label>
                                        <input
                                          id={`${day}-${hourIdx}-special-openTime`}
                                          type="time"
                                          className={inputClass}
                                          value={specialHour.openTime}
                                          onChange={(event) =>
                                            updateSpecialHour(
                                              day,
                                              hourIdx,
                                              "openTime",
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label
                                          htmlFor={`${day}-${hourIdx}-special-closeTime`}
                                          className={labelClass}
                                        >
                                          Close
                                        </label>
                                        <input
                                          id={`${day}-${hourIdx}-special-closeTime`}
                                          type="time"
                                          className={inputClass}
                                          value={specialHour.closeTime}
                                          onChange={(event) =>
                                            updateSpecialHour(
                                              day,
                                              hourIdx,
                                              "closeTime",
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-3">
                                      <label
                                        htmlFor={`${day}-${hourIdx}-special-title`}
                                        className={labelClass}
                                      >
                                        Title
                                      </label>
                                      <input
                                        id={`${day}-${hourIdx}-special-title`}
                                        type="text"
                                        className={inputClass}
                                        value={specialHour.title}
                                        onChange={(event) =>
                                          updateSpecialHour(
                                            day,
                                            hourIdx,
                                            "title",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="mt-3">
                                      <label
                                        htmlFor={`${day}-${hourIdx}-special-note`}
                                        className={labelClass}
                                      >
                                        Note
                                      </label>
                                      <textarea
                                        id={`${day}-${hourIdx}-special-note`}
                                        className={inputClass}
                                        value={specialHour.note}
                                        onChange={(event) =>
                                          updateSpecialHour(
                                            day,
                                            hourIdx,
                                            "note",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      className="mt-3 rounded-lg px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        void removeSpecialHour(day, hourIdx)
                                      }
                                    >
                                      Remove
                                    </button>
                                  </>
                                ) : (
                                  <div className="space-y-3 text-sm">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <p className={labelClass}>Open</p>
                                        <p className="mt-1 text-gray-700">
                                          {specialHour.openTime || "Not set"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className={labelClass}>Close</p>
                                        <p className="mt-1 text-gray-700">
                                          {specialHour.closeTime || "Not set"}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <p className={labelClass}>Title</p>
                                      <p className="mt-1 text-gray-700">
                                        {specialHour.title || "Not provided"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className={labelClass}>Note</p>
                                      <p className="mt-1 whitespace-pre-wrap text-gray-700">
                                        {specialHour.note || "Not provided"}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {canManage && (
        <>
          <div className="border-t border-gray-100 px-5 py-4 mt-4 sm:px-6">
            <label
              htmlFor="apply-to-synced"
              className="flex cursor-pointer items-start gap-2"
            >
              <input
                id="apply-to-synced"
                name="apply-to-synced"
                type="checkbox"
                className="mt-1"
                checked={applyToSynced}
                onChange={(event) => setApplyToSynced(event.target.checked)}
                disabled={isSaving}
              />

              <span>
                <span className="block font-semibold text-gray-900">
                  Apply to synchronized locations
                </span>
                <span className="text-sm leading-6 text-gray-600">
                  Keep synchronized days, regular hours, and special hours
                  updated across their other synchronized locations. Turn this
                  off to change only this location. When saving changes after
                  applying synchronization, all other locations sync with the
                  current saved changes.
                </span>
              </span>
            </label>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
            <button
              className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={!canSubmit}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
