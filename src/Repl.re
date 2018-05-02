/* open Sexp; */
open Serapi_protocol;

/* TODO:
  - handle up / down arrows
  - C-a, C-e, C-c etc
*/
type action =
  | Typed(string)
  | Command(string);
  /* | Message(answer); */

module StringMap = Map.Make({
  type t = string;
  let compare = compare
});

type state = {
  text: string,
  history: list((string, Stateid.t, list(answer_kind), list(answer_kind))),
  /* inputRef: ref(option(ReasonReact.reactRef)), */
  inputRef: ref(option(Dom.element)),
};

let component = ReasonReact.reducerComponent("Repl");

let valueFromEvent = (evt) : string => (
  evt
  |> ReactEventRe.Form.target
  |> ReactDOMRe.domElementToObj
)##value;

let setInputRef = (theRef: Js.nullable(Dom.element), {ReasonReact.state}) => {
  state.inputRef := Js.Nullable.toOption(theRef);
};

Printexc.record_backtrace(true);
Flags.debug := true;
Lib.init();
Global.set_engagement(Declarations.PredicativeSet);

let stm_options = Stm.AsyncOpts.default_opts;
CoqworkmgrApi.(init(High));

/* We need to declare a toplevel module name. */
let sertop_dp = Names.DirPath.make([Names.Id.of_string("coqbs")]);

Stm.init_core();
let ndoc = {
  Stm.doc_type: Stm.Interactive(sertop_dp),
  require_libs: [/* ("Coq.Init.Prelude", None, Some(true)) */],
  stm_options,
};
let (doc, _) = Stm.new_doc(ndoc);

/* workaround to load G_constr / G_prim (side-effecting import) */
let _ = G_constr.ldots_var;
let _ = G_prim.prim_kw;
let _ = G_vernac.vernac_kw;
let _ = G_tactic.tactic_kw;

let pp_answer = (answer) => {
  Serapi_protocol.pp_answer(Format.str_formatter, answer);
  Format.flush_str_formatter()
};

/*
let result = exec_cmd(Add(
      { lim: None,
        ontop: None,
        newtip: None,
        verb: true
      },
      "Definition f := g."
));
List.map(ans => Js.log(pp_answer(ans)), result);

let result = exec_cmd(Query(
      {
        preds: [],
        limit: None,
        /* TODO: how to use default fields? */
        sid: Stm.get_current_state(~doc),
        pp: { pp_format: PpStr, pp_depth: 0, pp_elide: "...", pp_margin: 72 },
        route: 0,
      },
      Ast
));
List.map(ans => Serapi_protocol.pp_answer(Format.std_formatter, ans), result);

let _result = exec_cmd(Add(
      { lim: None,
        ontop: None,
        newtip: None,
        verb: true
      },
      "Inductive empty :=."
      /* "Inductive nat : Set := O : nat | S : nat -> nat." */
      /* "Inductive bool := True | False." */
      /* "Inductive foo := Foo : foo." */
));

Js.log("querying for data type");
let result = exec_cmd(Query(
      {
        preds: [],
        limit: None,
        /* TODO: how to use default fields? */
        sid: Stm.get_current_state(~doc),
        pp: { pp_format: PpStr, pp_depth: 0, pp_elide: "...", pp_margin: 72 },
        route: 0,
      },
      Ast
));
*/

Feedback.add_feeder(Js.log);

let make = (_children) => {
  ...component,

  initialState: fun () => {
    {
      text: "",
      history: [],
      inputRef: ref(None),
    }
  },

  didMount: fun (_self) => {
    ReasonReact.SideEffects(_self => ());
  },

  reducer: fun (action, state) =>
    switch (action) {

    | Command(line) => {
      let history = state.history;
      let results = exec_cmd(Add(
        { lim: None,
          ontop: None,
          newtip: None,
          verb: true
        },
        line
      ));
      let Added(stateId, _loc, _) = List.find(
        result => switch (result) {
          | Added(_, _, _) => true
          | _ => false
          },
        results
      );
      let ast = exec_cmd(Query(
            {
              preds: [],
              limit: None,
              /* TODO: how to use default fields? */
              sid: stateId, /* Stm.get_current_state(~doc), */
              pp: { pp_format: PpStr, pp_depth: 0, pp_elide: "...", pp_margin: 72 },
              route: 0,
            },
            Ast
      ));
      ReasonReact.Update({
        ...state,
        history: [(line, stateId, ast, results), ...history],
        text: "",
      })
    }
    | Typed(text) => ReasonReact.Update({...state, text})
  },

  render: ({state: {history, text, inputRef}, reduce, handle}) => {
    /* TODO: make collapsible */
    let historyOutput =
      history
      |> List.mapi((i1, (op, _stateId, astOutput, output)) => {
        /* TODO: we actually want this to appear to the side. I think. */
        let output_elems =
          output
          |> List.mapi((i2, answer_kind) => (
            <p key=("answer." ++ string_of_int(i1) ++ "." ++ string_of_int(i2))>
              (ReasonReact.stringToElement(
                  pp_answer(answer_kind)
              ))
            </p>
          ));
        let ast_output_elems =
          astOutput
          |> List.mapi((i2, answer_kind) => (
            <p key=("ast." ++ string_of_int(i1) ++ "." ++ string_of_int(i2))>
              (ReasonReact.stringToElement(
                  pp_answer(answer_kind)
              ))
            </p>
          ));

        Array.of_list(
          [ <p key=(string_of_int(i1))>(ReasonReact.stringToElement("> "++ op))</p>,
          ...List.concat([output_elems, ast_output_elems])
          ]);
      })
      |> List.rev
      |> Array.concat
      |> ReasonReact.arrayToElement;

    /* Autofocus input whenever the console is clicked */
    <div className="container">
      <div
        className="input"
        onClick=((_evt) => switch (inputRef^) {
        | Some(input) =>
          let node = ReactDOMRe.domElementToObj(input);
          /* let node = ReasonReact.refToJsObj(input); */
          node##focus();
        | _ => ()
        })
      >
        (historyOutput)
        <p>
          <span className="prompt">(ReasonReact.stringToElement("> "))</span>
          <input
            ref=(handle(setInputRef))
            autoFocus=Js.true_
            value=text
            _type="text"
            onChange=(reduce((evt) => Typed(valueFromEvent(evt))))
            onKeyDown=((evt) =>
            if (ReactEventRe.Keyboard.key(evt) == "Enter") {
              (reduce(() => Command(text)))()
            })
          />
        </p>
      </div>
    </div>
  }
};
