type token =
  | LParenToken
  | RParenToken
  | SymbolToken(string)
  | StringToken(string);

exception Bad_tokenize;
exception Unexpected_end;
exception Tokens_remaining(list(token));
exception CoqExn;

/* Convert a string of characters into a list of tokens. */
let tokenize = fun (input: string) => {
  /* the start and end index of the current token */
  let range_start = ref(0);
  let range_end = ref(0);
  /* the list of tokens we're building */
  let tokens = ref([]);
  let in_string = ref(false);

  let delimiter_reached = fun (delimiter_token: option(token)): unit => {
    if (in_string^) {
      range_end := range_end^ + 1;
    } else {
      /* if we've accumulated a non-empty range of text, add a SymbolToken */
      if (range_end^ > range_start^) {
        let text = String.sub(input, range_start^, range_end^ - range_start^);
        tokens := [SymbolToken(text), ...tokens^];
      };
      /* add the token representing the delimiter, if provided */
      switch delimiter_token {
        | Some(token) => tokens := [token, ...tokens^];
        | None => ()
      };
      /* start a new text token range at the next char */
      range_start := range_end^ + 1;
      range_end := range_end^ + 1;
    }
  };

  let quote_reached = fun (): unit => {
    if (in_string^) {
      let text = String.sub(input, range_start^, range_end^ - range_start^);
      tokens := [StringToken(text), ...tokens^];
    };
    /* start a new text token range at the next char */
    range_start := range_end^ + 1;
    range_end := range_end^ + 1;
    in_string := !in_string^;
  };

  /* match tokens until we reach the end of the input text */
  let input_length = String.length(input);
  while (range_end^ < input_length) {
    let current_char = input.[range_end^];
    switch (current_char) {
      /* parens */
      | '(' => delimiter_reached(Some(LParenToken))
      | ')' => delimiter_reached(Some(RParenToken))
      | '"' => quote_reached()
      | '\'' => raise(Bad_tokenize)
      /* whitespace */
      | ' ' | '\t' | '\n' | '\r' => delimiter_reached(None)
      /* just like the next case except we want to also skip the following char */
      | '\\' => { range_end := range_end^ + 2 }
      /* any other text char becomes part of a text token */
      | _ => {
        /* expand the current token range to include this character */
        range_end := range_end^ + 1
      }
    }
  };
  List.rev(tokens^)
};

type sexp =
  | Number(int)
  | Symbol(string)
  | List(list(sexp))
  | String(string);

let rec sexp_from_tokens = fun (remaining_tokens: ref(list(token))): sexp => {
  switch (remaining_tokens^) {
    | [] => raise(Unexpected_end)
    | [LParenToken, ...rest] => {
      remaining_tokens := rest;
      let values_list: list(sexp) = [];
      sexp_list_from_tokens(remaining_tokens, values_list)
    }
    | [RParenToken, ...rest] => raise(Unexpected_end)
    | [SymbolToken(text), ...rest] => {
      remaining_tokens := rest;
      /* hack: switch to int_of_string_opt when available */
      if (Js.Float.isNaN(Js.Float.fromString(text))) Symbol(text)
      else Number(int_of_string(text))
    }
    | [StringToken(text), ...rest] => {
      remaining_tokens := rest;
      String(text)
    }
  }
} and sexp_list_from_tokens = fun (remaining_tokens: ref(list(token)), values_list: list(sexp)) => {
  switch remaining_tokens^ {
    | [] => raise(Unexpected_end)
    | [RParenToken, ...rest] => {
      remaining_tokens := rest;
      List(List.rev(values_list))
    }
    | _ => {
      let value = sexp_from_tokens(remaining_tokens);
      sexp_list_from_tokens(remaining_tokens, [value, ...values_list]);
    }
  };
};

/* Read a Scheme expression from a string. */
let parse = fun (program) => {
  let tokens = ref(tokenize(program));
  let value = sexp_from_tokens(tokens);
  if (tokens^ != []) raise(Tokens_remaining(tokens^));
  value;
};

/*
Js.log(parse("(Add () \"Lemma addn0 n : n + 0 = n. Proof. now induction n. Qed.\")"));
Js.log(parse("(Exec 5)"));
Js.log(parse("(Query ((sid 3) (pp ((pp_format PpStr)))) Goals)"));
*/

open Serapi_protocol;

let read_cmd = fun (exp: sexp): option(cmd) {
  Js.log2("read_cmd", exp);
  None
};

let read_goals = fun (exp: sexp): option(Proof.pre_goals(Serapi_goals.reified_goal(Constr.t))) {
  Js.log2("read_goals", exp);
  None
};

let read_ast = fun (exp: sexp): option(Loc.located(Vernacexpr.vernac_control)) {
  Js.log2("read_ast", exp);
  None
};

let read_constr = fun (exp: sexp): option(Constr.constr) {
  Js.log2("read_constr", exp);
  None
};

let read_constr_expr = fun (exp: sexp): option(Constrexpr.constr_expr) {
  Js.log2("read_constr_expr", exp);
  None
};

let read_coq_object = fun (exp: sexp): option(coq_object) {
  Js.log2("read_coq_object", exp);
  switch (exp) {
    | List([ Symbol("CoqGoal"), goals ])
      => Js.Option.map([@bs] x => CoqGoal(x), read_goals(goals))
    | List([ Symbol("CoqAst"), ast ])
      => Js.Option.map([@bs] x => CoqAst(x), read_ast(ast))
    | List([ Symbol("CoqConstr"), constr ])
      => Js.Option.map([@bs] x => CoqConstr(x), read_constr(constr))
    | List([ Symbol("CoqExpr"), constr_expr ])
      => Js.Option.map([@bs] x => CoqExpr(x), read_constr_expr(constr_expr))
    | List([ Symbol("CoqMInd"), names, declarations ]) => {
      Js.log3("read_m_ind", names, declarations);
      None
    }
  }
};

let read_answer = fun (exp: sexp): option(answer_kind) {
  switch (exp) {
    | Symbol("Ack") => Some(Ack)
    | Symbol("Completed") => Some(Completed)
    | List([ Symbol("CoqExn"), _rest ]) => raise(CoqExn)
    | List([ Symbol("Added"), Number(n), _loc, Symbol("NewTip") ])
      => Some(Added(string_of_int(n), (), `NewTip))
    | List([ Symbol("Added"), Number(n), _loc, Symbol("NewTip") ])
      => Some(Added(string_of_int(n), (), `NewTip))
    | List([ Symbol("ObjList"), List(obj_list) ])
      => Js.Option.map(
        [@bs] x => ObjList(x),
        Js.List.foldRight([@bs] (coq_obj, acc) => {
          switch (read_coq_object(coq_obj), acc) {
            | (None, _) | (_, None) => None
            | _ => None
          }
        }, obj_list, Some([]))
      )
  }
};

let read_feedback_content = fun (exp: sexp): option(Feedback.feedback_content) {
  switch (exp) {
    | Symbol("Processed")  => Some(Processed)
    | Symbol("Incomplete") => Some(Incomplete)
    | Symbol("Complete")   => Some(Complete)

    | List([ Symbol("ProcessingIn"), Symbol(name) ]) => Some(ProcessingIn(name))
    | List([ Symbol("InProgress"), Number(n) ]) => Some(InProgress(n))
    | List([ Symbol("WorkerStatus"), Symbol(x), Symbol(y) ]) => Some(WorkerStatus(x, y))
    | Symbol("AddedAxiom") => Some(AddedAxiom)

    | List([ Symbol("FileDependency"), List([]), Symbol(modName) ]) => Some(FileDependency(None, modName))
    | List([ Symbol("FileDependency"), List([ Symbol(optName) ]), Symbol(modName) ]) => Some(FileDependency(Some(optName), modName))
    | List([ Symbol("FileLoaded"), Symbol(modName), Symbol(fileName) ]) => Some(FileLoaded(modName, fileName))
    | _ => None
  }
};

let read_feedback = fun (exp: sexp): option(Feedback.feedback) {
  open Feedback;

  switch (exp) {
    | List([ List([ Symbol("id"), Number(doc_id) ]),
        List([ Symbol("route"), Number(route) ]),
        List([ Symbol("contents"), raw_contents ])
      ]) =>
      Js.Option.map([@bs] (contents => {
        doc_id,
        span_id: "TODO: span_id",
        route,
        contents,
      }), read_feedback_content(raw_contents))
    | _ => None
  }
};

let read_response = fun (exp: sexp): option(answer) {
  switch (exp) {
    | List([ Symbol("Answer"), Number(n), rest ])
      => Js.Option.map([@bs] (x => Answer(n, x)), read_answer(rest))
    | List([ Symbol("Feedback"), rest ])
      => Js.Option.map([@bs] (x => Feedback(x)), read_feedback(rest))

    | List([ Symbol("LibInfo"), ...rest ])
      => { Js.log2("not yet handling LibInfo", rest); None }
    | List([ Symbol("LibProgress"), progress_info ])
      => { Js.log2("not yet handling LibProgress", progress_info); None }
    | List([ Symbol("LibLoaded"), pkg ])
      => { Js.log2("not yet handling LibLoaded", pkg); None }

    | List([ Symbol("StdErr"), msg ])
      => { Js.log2("not yet handling StdErr", msg); None }

    | _ => None
  }
};
