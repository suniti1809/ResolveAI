import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Bot,
  Loader2,
  Send,
  Sparkles,
  User
} from "lucide-react";

import axios from "axios";


/* =========================================================
   BACKEND URL
========================================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://resolveai-xnzt.onrender.com";


const api = axios.create({

  baseURL: API_BASE_URL,

  timeout: 120000,

});


/* =========================================================
   ID
========================================================= */

function createId() {

  return (
    Date.now() +
    Math.random()
      .toString(36)
      .substring(2)
  );

}


/* =========================================================
   COMPONENT
========================================================= */

export default function AIAssistant({

  complaintId = null,

}) {

  const [
    messages,
    setMessages
  ] = useState([

    {

      id: createId(),

      role: "assistant",

      content:
        "Hello. I am ResolveAI AI Copilot. How can I help with this complaint?"

    }

  ]);


  const [
    input,
    setInput
  ] = useState("");


  const [
    loading,
    setLoading
  ] = useState(false);


  const [
    error,
    setError
  ] = useState("");


  const bottomRef =
    useRef(null);


  /* =======================================================
     SCROLL
  ======================================================= */

  useEffect(() => {

    bottomRef.current?.scrollIntoView({

      behavior: "smooth"

    });

  }, [messages]);


  /* =======================================================
     SEND
  ======================================================= */

  async function sendMessage() {

    const text =
      input.trim();


    if (
      !text ||
      loading
    ) {

      return;

    }


    setError("");


    const userMessage = {

      id: createId(),

      role: "user",

      content: text

    };


    const conversation = [

      ...messages,

      userMessage

    ];


    setMessages(
      conversation
    );


    setInput("");

    setLoading(true);


    try {

      const response =
        await api.post(
          "/api/assistant/chat",
          {

            messages:
              conversation.map(
                message => ({

                  role:
                    message.role,

                  content:
                    message.content

                })
              ),

            complaint_id:
              complaintId || null

          }
        );


      const reply =
        response.data?.reply;


      if (!reply) {

        throw new Error(
          "Empty AI response."
        );

      }


      setMessages(
        previous => [

          ...previous,

          {

            id: createId(),

            role: "assistant",

            content: reply

          }

        ]
      );


    } catch (err) {

      console.error(
        "AI error:",
        err
      );


      const status =
        err.response?.status;


      const detail =
        err.response?.data?.detail;


      let message;


      if (!err.response) {

        message =
          "Cannot connect to Render backend. Check VITE_API_BASE_URL.";

      }

      else if (status === 404) {

        message =
          "AI endpoint not found. Check backend deployment.";

      }

      else if (status === 405) {

        message =
          "405 Method Not Allowed. The endpoint must use POST.";

      }

      else if (status === 401) {

        message =
          "Groq authentication failed. Check GROQ_API_KEY on Render.";

      }

      else if (status === 403) {

        message =
          "Groq request forbidden. Check API key/model access.";

      }

      else if (status === 500) {

        message =
          detail ||
          "Backend AI error. Check Render logs.";

      }

      else if (status === 503) {

        message =
          detail ||
          "AI service unavailable.";

      }

      else {

        message =
          detail ||
          "AI request failed.";

      }


      setError(message);


      setMessages(
        previous => [

          ...previous,

          {

            id: createId(),

            role: "assistant",

            content:
              `⚠️ ${message}`

          }

        ]
      );


    } finally {

      setLoading(false);

    }

  }


  /* =======================================================
     ENTER
  ======================================================= */

  function handleKeyDown(
    event
  ) {

    if (

      event.key === "Enter" &&

      !event.shiftKey

    ) {

      event.preventDefault();

      sendMessage();

    }

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <div className="
      flex
      h-full
      flex-col
      rounded-xl
      border
      bg-white
    ">


      {/* HEADER */}

      <div className="
        flex
        items-center
        gap-3
        border-b
        p-4
      ">

        <div className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-lg
          bg-blue-100
        ">

          <Bot
            size={22}
            className="text-blue-600"
          />

        </div>


        <div>

          <h2 className="
            font-semibold
          ">

            AI Copilot

          </h2>


          <p className="
            text-xs
            text-gray-500
          ">

            Gemma 2 9B IT

          </p>

        </div>


        <Sparkles
          size={18}
          className="
            ml-auto
            text-blue-500
          "
        />

      </div>


      {/* MESSAGES */}

      <div className="
        flex-1
        space-y-4
        overflow-y-auto
        p-4
      ">


        {messages.map(
          message => (

            <div
              key={message.id}
              className={`
                flex
                gap-3
                ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }
              `}
            >


              {message.role ===
                "assistant" && (

                <div className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-100
                ">

                  <Bot
                    size={16}
                    className="
                      text-blue-600
                    "
                  />

                </div>

              )}


              <div className={`
                max-w-[80%]
                whitespace-pre-wrap
                rounded-xl
                px-4
                py-3
                text-sm

                ${
                  message.role === "user"

                    ? "bg-blue-600 text-white"

                    : "bg-gray-100 text-gray-800"
                }
              `}>

                {message.content}

              </div>


              {message.role ===
                "user" && (

                <div className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-gray-200
                ">

                  <User
                    size={16}
                  />

                </div>

              )}

            </div>

          )
        )}


        {loading && (

          <div className="
            flex
            items-center
            gap-2
            text-sm
            text-gray-500
          ">

            <Loader2
              size={16}
              className="
                animate-spin
              "
            />

            AI is thinking...

          </div>

        )}


        <div
          ref={bottomRef}
        />

      </div>


      {/* ERROR */}

      {error && (

        <div className="
          border-t
          bg-red-50
          px-4
          py-2
          text-xs
          text-red-700
        ">

          {error}

        </div>

      )}


      {/* INPUT */}

      <div className="
        border-t
        p-3
      ">

        <div className="
          flex
          items-end
          gap-2
        ">


          <textarea

            value={input}

            onChange={
              event =>
                setInput(
                  event.target.value
                )
            }

            onKeyDown={
              handleKeyDown
            }

            disabled={loading}

            rows={2}

            placeholder="
              Ask about this complaint...
            "

            className="
              flex-1
              resize-none
              rounded-lg
              border
              p-3
              text-sm
              outline-none
              focus:border-blue-500
            "

          />


          <button

            onClick={
              sendMessage
            }

            disabled={
              loading ||
              !input.trim()
            }

            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              bg-blue-600
              text-white
              disabled:cursor-not-allowed
              disabled:opacity-50
            "

          >

            {loading ? (

              <Loader2
                size={18}
                className="
                  animate-spin
                "
              />

            ) : (

              <Send
                size={18}
              />

            )}

          </button>

        </div>

      </div>

    </div>

  );

}
