type telescope =
  | TNil of Evd.evar_map
  | TCons of Environ.env * Evd.evar_map * EConstr.types * (Evd.evar_map -> EConstr.constr -> telescope)

type +'a tactic
