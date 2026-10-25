import { Link } from "react-router-dom";
import {
  formatLong,
  formatShort,
  formatWeekday,
  groupByMonth,
  groupByWeek,
  mondayIndex,
  monthLabel,
  parseISODate,
} from "../dates";
import { MEAL_LABELS, type Menu, type MenuDay, type MenuDish, type MenuMeal } from "../types";

export type MenuViewMode = "semana" | "mes" | "dia" | "lista";

interface Props {
  menu: Menu;
  mode: MenuViewMode;
  publicMode?: boolean;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function DishLink({ dish, menu, publicMode, compact }: { dish: MenuDish; menu: Menu; publicMode?: boolean; compact?: boolean }) {
  const ref = menu.recipes[dish.recipe_id];
  const kcal = ref?.kcal_per_serving;
  const label = (
    <>
      <span className="dish-title">{dish.titulo}</span>
      {!compact && kcal != null && <span className="dish-kcal"> · {Math.round(kcal)} kcal</span>}
    </>
  );
  if (publicMode) {
    if (ref?.share_token) {
      return (
        <a href={`/s/${ref.share_token}`} target="_blank" rel="noreferrer" className="dish-link">
          {label}
        </a>
      );
    }
    return <span className="dish-link dish-plain">{label}</span>;
  }
  return (
    <Link to={`/receta/${dish.recipe_id}`} className="dish-link">
      {label}
    </Link>
  );
}

function MealBlock({ meal, menu, publicMode }: { meal: MenuMeal; menu: Menu; publicMode?: boolean }) {
  return (
    <div className="meal-block">
      <div className="meal-type">{MEAL_LABELS[meal.tipo] ?? meal.tipo}</div>
      {meal.platos.length === 0 && <div className="muted">—</div>}
      {meal.platos.map((dish, i) => (
        <div key={i} className="dish">
          <DishLink dish={dish} menu={menu} publicMode={publicMode} />
          {dish.nota && <div className="dish-note">{dish.nota}</div>}
        </div>
      ))}
      {meal.nota && <div className="meal-note">{meal.nota}</div>}
    </div>
  );
}

function dayMap(menu: Menu): Map<string, MenuDay> {
  return new Map((menu.plan?.dias ?? []).map((d) => [d.fecha, d]));
}

export function MenuPlanView({ menu, mode, publicMode }: Props) {
  const days = menu.plan?.dias ?? [];
  const dates = days.map((d) => d.fecha);
  const byDate = dayMap(menu);
  const meals = menu.meals;

  if (days.length === 0) return <p className="muted">Este menú no tiene días planificados.</p>;

  if (mode === "semana") {
    return (
      <div className="plan-weeks">
        {groupByWeek(dates).map((week) => (
          <div key={week[0]} className="panel plan-week">
            <div className="plan-week-title">
              Semana del {formatShort(week[0])} al {formatShort(week[week.length - 1])}
            </div>
            <div className="plan-week-scroll">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th className="plan-corner" />
                    {week.map((iso) => (
                      <th key={iso}>
                        <div className="plan-day-head">
                          <span className="plan-weekday">{formatWeekday(iso)}</span>
                          <span className="plan-daynum">{parseISODate(iso).getDate()}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meals.map((mealType) => (
                    <tr key={mealType}>
                      <th className="plan-meal-head">{MEAL_LABELS[mealType]}</th>
                      {week.map((iso) => {
                        const meal = byDate.get(iso)?.comidas.find((c) => c.tipo === mealType);
                        return (
                          <td key={iso}>
                            {meal?.platos.map((dish, i) => (
                              <div key={i} className="dish">
                                <DishLink dish={dish} menu={menu} publicMode={publicMode} />
                                {dish.nota && <div className="dish-note">{dish.nota}</div>}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mode === "mes") {
    return (
      <div className="plan-months">
        {groupByMonth(dates).map((month) => {
          const offset = mondayIndex(month.first);
          const monthDates = new Set(month.dates);
          const totalDays = new Date(month.first.getFullYear(), month.first.getMonth() + 1, 0).getDate();
          const cells: (string | null)[] = [];
          for (let i = 0; i < offset; i++) cells.push(null);
          for (let d = 1; d <= totalDays; d++) {
            const iso = `${month.key}-${String(d).padStart(2, "0")}`;
            cells.push(iso);
          }
          while (cells.length % 7 !== 0) cells.push(null);
          return (
            <div key={month.key} className="panel plan-month">
              <div className="plan-week-title">{monthLabel(month.first)}</div>
              <div className="plan-month-grid">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="plan-month-weekday">
                    {w}
                  </div>
                ))}
                {cells.map((iso, i) => {
                  if (!iso) return <div key={i} className="plan-month-cell empty" />;
                  const inMenu = monthDates.has(iso);
                  const day = byDate.get(iso);
                  return (
                    <div key={iso} className={`plan-month-cell ${inMenu ? "" : "outside"}`}>
                      <div className="plan-month-daynum">{parseISODate(iso).getDate()}</div>
                      {day?.comidas.map((meal) => (
                        <div key={meal.tipo} className="plan-month-meal">
                          <span className="plan-month-meal-type">{MEAL_LABELS[meal.tipo].slice(0, 3)}</span>
                          {meal.platos.map((dish, j) => (
                            <div key={j} className="plan-month-dish">
                              <DishLink dish={dish} menu={menu} publicMode={publicMode} compact />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === "dia") {
    return (
      <div className="plan-days">
        {days.map((day) => (
          <div key={day.fecha} className="panel plan-day-card">
            <h3 className="plan-day-title">{formatLong(day.fecha)}</h3>
            <div className="plan-day-meals">
              {day.comidas.map((meal) => (
                <MealBlock key={meal.tipo} meal={meal} menu={menu} publicMode={publicMode} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="panel plan-list">
      {days.map((day) => (
        <div key={day.fecha} className="plan-list-day">
          <div className="plan-list-date">{formatLong(day.fecha)}</div>
          <ul>
            {day.comidas.map((meal) => (
              <li key={meal.tipo}>
                <strong>{MEAL_LABELS[meal.tipo]}:</strong>{" "}
                {meal.platos.length === 0
                  ? "—"
                  : meal.platos.map((dish, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        <DishLink dish={dish} menu={menu} publicMode={publicMode} compact />
                        {dish.nota && <span className="muted"> ({dish.nota})</span>}
                      </span>
                    ))}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
