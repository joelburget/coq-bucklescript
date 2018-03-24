open Sexp;
open Serapi_protocol;

/* TODO:
  - handle up / down arrows
  - C-a, C-e, C-c etc
*/
type action =
  | Typed(string)
  | Command(string)
  | Message(answer);

type state = {
  text: string,
  history: array((string, list(answer_kind))),
  /* inputRef: ref(option(ReasonReact.reactRef)), */
  inputRef: ref(option(Dom.element)),
  worker: WebWorkers.webWorker,
};

let component = ReasonReact.reducerComponent("Repl");

let onSubmit = (text) => { Js.log(text) };

let valueFromEvent = (evt) : string => (
  evt
  |> ReactEventRe.Form.target
  |> ReactDOMRe.domElementToObj
)##value;

let setInputRef = (theRef: Js.nullable(Dom.element), {ReasonReact.state}) => {
  state.inputRef := Js.Nullable.toOption(theRef);
};

let make = (_children) => {
  ...component,

  initialState: fun () => {
    let worker = WebWorkers.create_webworker("jscoq/sertop_js.js");
    {
      text: "",
      history: [| |],
      inputRef: ref(None),
      worker,
    }
  },

  didMount: fun (_self) => {
    ReasonReact.SideEffects(self => {
      WebWorkers.onMessage(self.state.worker, evt => {
        let data = WebWorkers.MessageEvent.data(evt);
        let response = try (Sexp.read_response(Sexp.parse(data))) {
          | Bad_tokenize              => None
          | Unexpected_end            => None
          | Tokens_remaining(_tokens) => None
        };
        Js.log3("worker message:", data, response);
        switch (response) {
          | None         => ()
          | Some(answer) => self.send(Message(answer))
        }
      });
    });
  },

  reducer: fun (action, state) =>
    switch (action) {

    | Command(line) => {
      let history = state.history;
      let len = Array.length(history);
      /* unsafe_set because we're extending the array */
      Array.unsafe_set(history, len, (line, []));
      ReasonReact.UpdateWithSideEffects({
        ...state,
        history,
        text: "",
      }, _self => WebWorkers.postMessage(state.worker, line))
    }
    | Typed(text) => ReasonReact.Update({...state, text})

    /* TODO: scroll to bottom (if already scrolled) */
    /* TODO: track Ack / Completed */
    | Message(msg) => {
      switch(msg) {
        | Answer(cmd_tag, answer_kind) => {
          let history = state.history;
          let (cmd, prev_history) = Array.get(history, cmd_tag);
          /* Array.set(history, cmd_tag, (cmd, [answer_kind, ...prev_history])); */
          Array.set(history, cmd_tag, (cmd, [answer_kind, ...prev_history]));
          ReasonReact.Update({...state, history})
        }
        | Feedback({ contents }) => ReasonReact.SideEffects(_self =>
          Js.log2("processing feedback", contents)
        )
      }
    }
  },

  render: ({state: {history, text, inputRef}, reduce, handle}) => {
    /* TODO: make collapsible */
    let historyOutput =
      history
      |> Array.mapi((i1, (op, output)) => {
        let output_elems =
          output
          |> List.mapi((i2, answer_kind) => (
            <p key=(string_of_int(i1) ++ "." ++ string_of_int(i2))>(ReasonReact.stringToElement(Js.String.make(answer_kind)))</p>
          ))
          |> List.rev;

        Array.of_list(
          [ <p key=string_of_int(i1)>(ReasonReact.stringToElement("> "++ op))</p>,
          ...output_elems
          ]);
      })
      |> Array.to_list /* TODO: it's silly to make into a list then back to array */
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
              onSubmit(text);
              (reduce(() => Command(text)))()
            })
          />
        </p>
      </div>
    </div>
  }
};
