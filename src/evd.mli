type evar_map = ()

type 'a sigma = {
  it : 'a ;
  (** The base object. *)
  sigma : evar_map
  (** The added unification state. *)
}
