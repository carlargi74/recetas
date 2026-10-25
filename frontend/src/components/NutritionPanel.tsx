import { LeafIcon } from "../icons";
import type { Nutrition, NutritionStatus } from "../types";

const MACROS: { key: keyof Nutrition; label: string; unit: string }[] = [
  { key: "calorias_kcal", label: "Calorías", unit: "kcal" },
  { key: "proteinas_g", label: "Proteínas", unit: "g" },
  { key: "hidratos_g", label: "Hidratos", unit: "g" },
  { key: "azucares_g", label: "de los cuales azúcares", unit: "g" },
  { key: "grasas_g", label: "Grasas", unit: "g" },
  { key: "grasas_saturadas_g", label: "de las cuales saturadas", unit: "g" },
  { key: "fibra_g", label: "Fibra", unit: "g" },
  { key: "sal_g", label: "Sal", unit: "g" },
  { key: "colesterol_mg", label: "Colesterol", unit: "mg" },
];

const VITAMINS: { key: string; label: string; unit: string }[] = [
  { key: "A_ug", label: "Vitamina A", unit: "µg" },
  { key: "C_mg", label: "Vitamina C", unit: "mg" },
  { key: "D_ug", label: "Vitamina D", unit: "µg" },
  { key: "E_mg", label: "Vitamina E", unit: "mg" },
  { key: "B12_ug", label: "Vitamina B12", unit: "µg" },
  { key: "B9_folato_ug", label: "Folato (B9)", unit: "µg" },
];

const MINERALS: { key: string; label: string; unit: string }[] = [
  { key: "calcio_mg", label: "Calcio", unit: "mg" },
  { key: "hierro_mg", label: "Hierro", unit: "mg" },
  { key: "magnesio_mg", label: "Magnesio", unit: "mg" },
  { key: "potasio_mg", label: "Potasio", unit: "mg" },
  { key: "zinc_mg", label: "Zinc", unit: "mg" },
  { key: "sodio_mg", label: "Sodio", unit: "mg" },
];

export function formatValue(value: number | null | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("es-ES")} ${unit}`;
}

interface Props {
  nutrition: Nutrition | null;
  status: NutritionStatus;
  onRecompute?: () => void;
}

export function NutritionPanel({ nutrition, status, onRecompute }: Props) {
  const computing = status === "pending" || status === "processing";

  return (
    <div className="panel nutrition-panel">
      <div className="nutrition-header">
        <h3 className="info-section-title" style={{ marginBottom: 0 }}>
          <LeafIcon />
          Valores nutricionales por ración
        </h3>
        {onRecompute && (
          <button className="btn btn-ghost btn-sm" onClick={onRecompute} disabled={computing}>
            {computing ? "Calculando..." : "Recalcular"}
          </button>
        )}
      </div>

      {computing && (
        <p className="muted" style={{ margin: "10px 0 0" }}>
          Estimando valores nutricionales con IA...
        </p>
      )}
      {status === "error" && !nutrition && (
        <p className="error-text">No se pudieron calcular. Prueba a recalcular.</p>
      )}

      {nutrition && (
        <>
          <table className="nutrition-table">
            <tbody>
              {MACROS.map((m) => (
                <tr key={m.key} className={m.label.startsWith("de l") ? "sub" : ""}>
                  <td>{m.label}</td>
                  <td>{formatValue(nutrition[m.key] as number | null | undefined, m.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className="nutrition-details">
            <summary>Vitaminas y minerales</summary>
            <div className="nutrition-micro">
              <table className="nutrition-table">
                <tbody>
                  {VITAMINS.map((v) => (
                    <tr key={v.key}>
                      <td>{v.label}</td>
                      <td>{formatValue(nutrition.vitaminas?.[v.key], v.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="nutrition-table">
                <tbody>
                  {MINERALS.map((m) => (
                    <tr key={m.key}>
                      <td>{m.label}</td>
                      <td>{formatValue(nutrition.minerales?.[m.key], m.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {nutrition.notas && <p className="muted nutrition-notes">{nutrition.notas}</p>}
          <p className="muted nutrition-disclaimer">
            Estimación orientativa calculada por IA a partir de los ingredientes
            {nutrition.raciones_consideradas ? ` (${nutrition.raciones_consideradas} raciones)` : ""}.
          </p>
        </>
      )}
    </div>
  );
}
