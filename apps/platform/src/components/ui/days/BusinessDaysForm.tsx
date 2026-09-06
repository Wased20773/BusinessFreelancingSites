import Divider from "@/components/layout/Divider";
import { LocationJson } from "@/types/types";
import { Dispatch, SetStateAction, SubmitEvent } from "react";

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
      className="dashboard-card flex flex-col gap-5"
      onSubmit={handleSubmit}
    >
      <fieldset>
        <legend>Business Schedule</legend>

        {canManage ? (
          <p>
            Set the regular opening and closing time for each day. Special hours
            can be added separately when this location operates outside of its
            normal schedule.
          </p>
        ) : (
          <p>
            View the days the business is open as well as their open and close
            hours.
          </p>
        )}

        <div className="flex flex-col gap-5 mt-2">
          {locationData.days.map((locationDay) => {
            const day = locationDay.dayOfWeek as DayOfWeek;
            const currentDay = days[day];

            return (
              <div
                key={currentDay.id}
                className="dashboard-card !bg-neutral-100 flex flex-col"
              >
                {/* DAY HEADER */}
                <div className="flex justify-between items-center mb-5">
                  <span className="font-semibold">{day}</span>

                  {canManage ? (
                    <label
                      htmlFor={`${day}-isClosed`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        id={`${day}-isClosed`}
                        name={`${day}-isClosed`}
                        type="checkbox"
                        checked={currentDay.isClosed}
                        onChange={(event) => {
                          setDays((currentDays) => {
                            if (!currentDays) {
                              return currentDays;
                            }

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
                    <span className="text-gray-500">
                      {currentDay.isClosed ? "Closed" : "Open"}
                    </span>
                  )}
                </div>

                {!currentDay.isClosed && (
                  <>
                    {/* ######################## */}
                    {/* ##### REGULAR HOURS #### */}
                    {/* ######################## */}

                    <div>
                      <p className="font-semibold">Regular Hours</p>

                      {canManage && (
                        <p className="text-sm text-gray-500 mb-3">
                          Set the normal opening and closing time for this day.
                        </p>
                      )}

                      {canManage ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor={`${day}-openTime`}
                              className="font-semibold"
                            >
                              Open
                            </label>

                            <input
                              id={`${day}-openTime`}
                              type="time"
                              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
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
                              className="font-semibold"
                            >
                              Close
                            </label>

                            <input
                              id={`${day}-closeTime`}
                              type="time"
                              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="font-semibold">Open</p>
                            <p className="mt-1">
                              {currentDay.hour?.openTime || "Not set"}
                            </p>
                          </div>

                          <div>
                            <p className="font-semibold">Close</p>
                            <p className="mt-1">
                              {currentDay.hour?.closeTime || "Not set"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ######################## */}
                    {/* ##### SPECIAL HOURS #### */}
                    {/* ######################## */}

                    <Divider />

                    <div>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="font-semibold">Special Hours</p>

                          {canManage && (
                            <p className="text-sm text-gray-500">
                              Add operating hours for this day.
                            </p>
                          )}
                        </div>

                        {canManage && (
                          <button
                            type="button"
                            className="border-[0.1rem] border-blue-400 rounded-lg px-3 py-1"
                            onClick={() => addSpecialHour(day)}
                          >
                            Add Another
                          </button>
                        )}
                      </div>

                      {currentDay.specialHours.length > 0 && (
                        <div className="flex flex-col gap-4 mt-4">
                          {currentDay.specialHours.map(
                            (specialHour, hourIdx) => (
                              <div
                                key={specialHour.id ?? hourIdx}
                                className="border-[0.1rem] border-gray-300 rounded-lg px-3 py-1"
                              >
                                {canManage ? (
                                  <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label
                                          htmlFor={`${day}-${hourIdx}-special-openTime`}
                                          className="font-semibold"
                                        >
                                          Open
                                        </label>

                                        <input
                                          id={`${day}-${hourIdx}-special-openTime`}
                                          type="time"
                                          className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
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
                                          className="font-semibold"
                                        >
                                          Close
                                        </label>

                                        <input
                                          id={`${day}-${hourIdx}-special-closeTime`}
                                          type="time"
                                          className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
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
                                        className="font-semibold"
                                      >
                                        Title
                                      </label>

                                      <input
                                        id={`${day}-${hourIdx}-special-title`}
                                        type="text"
                                        className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
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
                                        className="font-semibold"
                                      >
                                        Note
                                      </label>

                                      <textarea
                                        id={`${day}-${hourIdx}-special-note`}
                                        className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1"
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
                                      className="mt-3 text-red-500"
                                      onClick={() =>
                                        void removeSpecialHour(day, hourIdx)
                                      }
                                    >
                                      Remove
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <p className="font-semibold">Open</p>
                                        <p className="mt-1">
                                          {specialHour.openTime || "Not set"}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="font-semibold">Close</p>
                                        <p className="mt-1">
                                          {specialHour.closeTime || "Not set"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="mt-3">
                                      <p className="font-semibold">Title</p>
                                      <p className="mt-1">
                                        {specialHour.title || "Not provided"}
                                      </p>
                                    </div>

                                    <div className="mt-3">
                                      <p className="font-semibold">Note</p>
                                      <p className="mt-1">
                                        {specialHour.note || "Not provided"}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {canManage && (
        <>
          <div className="border-t border-gray-300 pt-5">
            <label
              htmlFor="apply-to-synced"
              className="flex items-start gap-2 cursor-pointer"
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
                <span className="font-semibold block">
                  Apply to synchronized locations
                </span>

                <span className="text-sm text-gray-500">
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
            <p role="alert" className="text-red-500">
              {errorMessage}
            </p>
          )}

          <button
            className="w-full md:w-fit bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={!canSubmit}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </form>
  );
}
