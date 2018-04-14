(************************************************************************)
(*         *   The Coq Proof Assistant / The Coq Development Team       *)
(*  v      *   INRIA, CNRS and contributors - Copyright 1999-2018       *)
(* <O___,, *       (see CREDITS file for the list of authors)           *)
(*   \VV/  **************************************************************)
(*    //   *    This file is distributed under the terms of the         *)
(*         *     GNU Lesser General Public License Version 2.1          *)
(*         *     (see LICENSE file for the text of the license)         *)
(************************************************************************)

type t = int

let repr x = x
let unsafe_of_int x = x
let compare = Pervasives.compare
let equal = Int.equal
let hash x = x
let print x = Pp.(str "?X" ++ int x)

module Set = Int.Set
module Map = Int.Map