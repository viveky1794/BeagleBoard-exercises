#!/usr/bin/env python3
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO, emit, disconnect

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)
thread = None

ARROW_UP    = "\033[A"
ARROW_DOWN  = "\033[B"
ARROW_RIGHT = "\033[C"
ARROW_LEFT  = "\033[D"
DEL         = "."
END         = "/"
SPACE       = " "
START_BAL   = "\n"
STOP_BAL    = "x"

buttons = [START_BAL, ARROW_UP, ARROW_LEFT, SPACE, 
            ARROW_RIGHT, ARROW_DOWN, STOP_BAL, DEL, END]

# "pip" is a named pipe that we right to and python/balance.py reads from
fd = open("pipe", 'w')

# def background_thread():
#     """Example of how to send server generated events to clients."""
#     count = 0
#     while True:
#         socketio.sleep(10)
#         count += 1
#         socketio.emit('my_response',
#                       {'data': 'Server generated event', 'count': count})


@app.route('/')
def index():
    return render_template('robot.html', async_mode=socketio.async_mode)

@socketio.on('my_event')
def test_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']})

@socketio.on('my_broadcast_event')
def test_broadcast_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']},
         broadcast=True)

@socketio.on('disconnect_request')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()


@socketio.on('my_ping')
def ping_pong():
    emit('my_pong')
    
@socketio.on('button')
def button(num):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'button ', 'count': session['receive_count']})
    print("Button")
    print(num)
    fd.write(buttons[int(num)])
    fd.flush()
    # sys.exit()

@socketio.on('connect')
def test_connect():
    # global thread
    # if thread is None:
    #     thread = socketio.start_background_task(target=background_thread)
    emit('my_response', {'data': 'Connected', 'count': 0})


@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected', request.sid)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', debug=False)
