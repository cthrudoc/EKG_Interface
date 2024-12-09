from urllib.parse import urlsplit
from flask import render_template, flash, redirect, url_for, request, abort, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from functools import wraps
import sqlalchemy as sa
import sqlalchemy.orm as so
from app import app, db
from app.forms import LoginForm, RegistrationForm, EditProfileForm
from app.models import User, User_Login, Chart, Vote, Post, Model_Timespans
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import h5py
import numpy
import requests
import json



####################### UTILITY TERRITORY #######################

context = 30 # Time added to the sides of the ECG fragment for context | GLOBAL VAR (I HEARD IT'S BAD(WORKS THO))

## Timezone handling
wars_tz = ZoneInfo('Europe/Warsaw') 
def timeformat(dt):
    return dt.strftime('%H:%M, %d.%m.%Y')

## Decorators

@app.before_request
def before_request():
    if current_user.is_authenticated:
        current_user.last_seen = datetime.now(wars_tz)
        db.session.commit()

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

def admin_prohibited(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.is_admin: 
            abort(403) 
        return f(*args, **kwargs) 
    return decorated_function 

## Error handler

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

## Test routes

@app.route('/testing', methods=['GET','POST'])
@login_required
def testing():
    return render_template('testing.html')

@app.route('/testing2', methods=['GET','POST'])
def testing2():
    return render_template('testing2.html')



####################### USER TERRITORY #######################

@app.route('/')
@app.route('/index')
@login_required
def index(): # index aktualnie nie ma funkcji, wiec przekierowuje do domyślnych stron w zależności od użytkownika 
    if current_user.is_authenticated: 
        if current_user.is_admin == True: 
            return redirect(url_for('admin')) 
        return redirect(url_for('user', username=current_user.username)) 
    return render_template('index.html', title='Home') 


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if current_user.is_admin == True:
            return redirect(url_for('admin'))
        return redirect(url_for('user', username=current_user.username))
    form = LoginForm()
    if form.validate_on_submit():
        user = db.session.scalar(
            sa.select(User).where(User.username == form.username.data))
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('login'))
        login_user(user, remember=form.remember_me.data)

        login_happened = User_Login(user_id = user.id) # śledzenie logowania 
        db.session.add(login_happened) # zapisywanie logowania 
        db.session.commit()

        next_page = request.args.get('next')
        if not next_page or urlsplit(next_page).netloc != '':
            next_page = url_for('admin') if user.is_admin else url_for('user', username=user.username)
        return redirect(next_page)
    return render_template('login.html', title='Sign In', form=form)


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
#    if current_user.is_authenticated:
#        return redirect(url_for('login'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Użytkownik zarejestrowany')
        return redirect(url_for('register'))
    return render_template('register.html', title='Register', form=form)


@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    form = EditProfileForm(current_user.username)
    if form.validate_on_submit():
        current_user.username = form.username.data
        current_user.about_me = form.about_me.data
        db.session.commit()
        flash('Your changes have been saved.')
        return redirect(url_for('edit_profile'))
    elif request.method == 'GET':
        form.username.data = current_user.username
        form.about_me.data = current_user.about_me
    return render_template('edit_profile.html', title='Edit Profile',
                           form=form)


@app.route('/user/<username>')
@login_required
@admin_prohibited
def user(username):
    user = db.first_or_404(sa.select(User).where(User.id == current_user.id))
    username = user.username

    ## wyświetlanie listy wykresów i głosy użytkownika 
    # paginacja

    page = request.args.get( 'page' , 1 , type = int )
    per_page = 10 
    offset = (page - 1) * per_page
    charts = db.session.execute(sa.select(Chart).offset(offset).limit(per_page)).scalars().all() # wczytywanie określonej liczby głosów 

    all_charts = db.session.execute(sa.select(Chart)).scalars().all()
    total_charts = len(all_charts)
    total_pages = (total_charts-1) // per_page + 1
    next_page = page + 1 if page*per_page < total_charts else None 
    prev_page = page - 1 if page >1 else None # jeżeli strona to 1 to nie wyświetlamy strony "zero"

    # tworzenie dict najnowszych głosów (bez powtórzonych głosów)
    votes = db.session.execute(sa.select(Vote).where(Vote.interacting_user == user.id)).scalars().all()  
    latest_votes_for_chart = {} # dict na najnowsze głosy
    for vote in votes:
        if vote.chart_id not in latest_votes_for_chart or vote.revision_number > latest_votes_for_chart[vote.chart_id].revision_number: # jeżeli jeszcze nie ma głosu albo głos w aktualnej pętli jest nowszy...
            latest_votes_for_chart[vote.chart_id] = vote # zapisujemy głos z aktualnej pętli
    
    # tworzenie listy wykresów i przypisanie do nich głosów użytkownika
    chart_to_display = []
    for chart in charts:
        requester_vote = latest_votes_for_chart.get(chart.id, None) 
        if requester_vote is not None:
            requester_vote = requester_vote.user_vote
        else:
            requester_vote = None
        chart_to_display.append({
            "chart_id": chart.id,
            "requester_vote": requester_vote
        })

    ## wywoływanie numeru ostatniego wykresu : 
    last_chart = user.last_chart

    return render_template(
        'user.html', user=user, 
        chart_data=chart_to_display , last_chart = last_chart , 
        next_page = next_page , prev_page = prev_page , total_pages = total_pages , current_page = page 
        )

@app.route('/wykres', methods=['GET','POST'])
@login_required
@admin_prohibited
def wykres(): 

    user = db.first_or_404(sa.select(User).where(User.id == current_user.id)) # wczytanie obiektu użytkownik 
    chart_id = request.args.get('chart_id', default = None, type = int)
    if chart_id: # wyświetlanie podanego wykresu, jeżeli nie podany, domyślnie ostatni wykres
        chart = db.first_or_404(sa.select(Chart).where(Chart.id == chart_id))
    else:
        chart = db.first_or_404(sa.select(Chart).where(Chart.id == user.last_chart))
        chart_id = chart.id

    total_charts = db.session.query(sa.func.count(Chart.id)).scalar() # Total number of votes. 
    # Determine previous and next chart IDs
    prev_chart_id = chart_id - 1 if chart_id > 1 else None
    next_chart_id = chart_id + 1 if chart_id < total_charts else None

    return render_template("wykres.html", chart_id = chart_id, prev_chart_id=prev_chart_id, next_chart_id=next_chart_id)    



####################### API TERRITORY #######################

@app.route('/api/wykres')
@login_required
def api_wykres(): 
    ## Getting the right chart
    user = db.first_or_404(sa.select(User).where(User.id == current_user.id)) # wczytanie obiektu użytkownik 
    chart_id = request.args.get('chart_id', default = 1, type = int)
    if chart_id: # wyświetlanie podanego wykresu, jeżeli nie podany, domyślnie ostatni wykres
        chart = db.first_or_404(sa.select(Chart).where(Chart.id == chart_id))
    else:
        chart = db.first_or_404(sa.select(Chart).where(Chart.id == user.last_chart))
        chart_id = chart.id
    # zapisywanie wyświetlanego wykresu jako ostatniego zapisanego
    user.last_chart = chart_id
    db.session.commit()

    ## Getting timespans for the curent chart 
    timespans = db.session.execute(
        sa.select(Model_Timespans).where(Model_Timespans.chart_id == chart_id)
    ).scalars().all()
    timespan_data = [
        {"start_time": ts.model_timespan_start, "end_time": ts.model_timespan_end, 'model_proposition': ts.model_proposition}
        for ts in timespans
    ]
    
    ## Initial timespan from which the first chart will be drawn 
    if timespan_data:
        initial_timespan_raw = timespan_data[0]
        initial_timespan = {
            "start_time": max(0, initial_timespan_raw["start_time"] - context),
            "end_time": initial_timespan_raw["end_time"] + context
        }

    ## Getting data to draw the initial timespan
    chart_data_response = requests.get(
        url_for('api_chart_data', _external=True), # _external allows generating full URL that enables it to connect 
        params={
            "chart_id": chart_id, 
            "start_time": initial_timespan["start_time"], 
            "end_time": initial_timespan["end_time"]}
    )
    if chart_data_response.status_code != 200: # catching error
        return jsonify({"error": "Failed to fetch initial chart data"}), 500
    initial_chart_data = chart_data_response.json() 

    response_data = {
        "chart_id": chart_id,
        "timespans": timespan_data,
        "initial_timespan": [initial_timespan],
        "initial_chart_data": initial_chart_data,
    }

    # print(json.dumps(response_data, indent=4)) # [DEBUG]

    return jsonify(response_data)

@app.route('/api/chart_data')
def api_chart_data():

    ## Getting data for processing request
    chart_id = request.args.get('chart_id', type=float)
    start_time_raw = request.args.get('start_time', type=float)
    end_time_raw = request.args.get('end_time', type=float)
    if start_time_raw is None or end_time_raw is None: # catching error 
        return jsonify({"error": "start and end times are required"}), 400
    
    start_time = max(0, start_time_raw - context)
    end_time = end_time_raw + context

    ## Getting the file path to charts hdf5 file
    filepath = db.session.execute(sa.select(Chart.chart_data).where(Chart.id == chart_id)).scalar()
    print(f'[api/chart_data]: charts filepath retrieved - {filepath}.') # [DEBUG] 
    if not filepath: # Error catching
        return jsonify({"error": "Chart file path not found"}), 404

    ## Getting chart data from charts hdf5 file
    with h5py.File(filepath, 'r') as f:
            time_data = f['time'][:] 
            strt_w_cntxt = numpy.searchsorted(time_data, start_time)
            end_w_cntxt = numpy.searchsorted(time_data, end_time) 
            chart_data = jsonify({
                "ECG": {
                    "time": f['time'][strt_w_cntxt:end_w_cntxt].tolist(),
                    "ch1": f['ch1'][strt_w_cntxt:end_w_cntxt].tolist(),
                    "ch2": f['ch2'][strt_w_cntxt:end_w_cntxt].tolist(),
                    "ch3": f['ch3'][strt_w_cntxt:end_w_cntxt].tolist(),
                }
            })
    
    return chart_data



####################### ADMIN TERRITORY #######################

@app.route('/admin')
@admin_required
def admin():
    return render_template("admin.html")


@app.route('/admin/users')
@admin_required
def admin_users():

    ## Paginacja

    page = request.args.get( 'page' , 1 , type = int )
    per_page = 10 
    offset = (page - 1) * per_page
    users = db.session.execute(sa.select(User).offset(offset).limit(per_page)).scalars().all() 

    total_users = db.session.query(User).count()
    total_pages = (total_users-1) // per_page + 1

    next_page = page + 1 if page*per_page < total_users else None 
    prev_page = page -1 if page >1 else None

    ## Wyświetlanie listy użytkowników

    total_charts = db.session.query(Chart).count()

    users_to_display = []
    for user in users:

        user_votes = db.session.execute(sa.select(Vote).where(Vote.interacting_user == user.id)).scalars().all() # all user's votes
        latest_votes_for_chart = {} # dict na najnowsze głosy
        for vote in user_votes:
            if vote.chart_id not in latest_votes_for_chart or vote.revision_number > latest_votes_for_chart[vote.chart_id].revision_number: # jeżeli jeszcze nie ma głosu albo głos w aktualnej pętli jest nowszy...
                latest_votes_for_chart[vote.chart_id] = vote # zapisujemy głos z aktualnej pętli
        votes_cast = len(latest_votes_for_chart)
        
        users_perc_completed = (votes_cast / total_charts) * 100 if total_charts > 0 else 0

        users_to_display.append({
            'user_id' : user.id , 
            'user_username' : user.username , 
            'user_last_seen' : user.last_seen ,
            'user_last_chart' : user.last_chart , 
            'user_perc_completed' : round(users_perc_completed, 2)
        })

    return render_template(
        'admin_users.html', 
        users_to_display = users_to_display , 
        next_page = next_page , prev_page = prev_page , total_pages = total_pages , current_page = page
        )

@app.route('/admin/users/<int:user_id>')
@admin_required
def admin_user_detail(user_id):
    user = db.session.execute(sa.select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        abort(404)

    ## wyświetlanie listy wykresów i głosy użytkownika 
    # paginacja
    page = request.args.get( 'page' , 1 , type = int )
    per_page = 10 
    offset = (page - 1) * per_page
    charts = db.session.execute(sa.select(Chart).offset(offset).limit(per_page)).scalars().all() # wczytywanie określonej liczby głosów 

    all_charts = db.session.execute(sa.select(Chart)).scalars().all()
    total_charts = len(all_charts)
    total_pages = (total_charts-1) // per_page + 1
    next_page = page + 1 if page*per_page < total_charts else None 
    prev_page = page - 1 if page >1 else None # jeżeli strona to 1 to nie wyświetlamy strony "zero"

    # tworzenie dict najnowszych głosów (bez powtórzonych głosów)
    votes = db.session.execute(sa.select(Vote).where(Vote.interacting_user == user.id)).scalars().all()  
    latest_votes_for_chart = {} # dict na najnowsze głosy
    for vote in votes:
        if vote.chart_id not in latest_votes_for_chart or vote.revision_number > latest_votes_for_chart[vote.chart_id].revision_number: # jeżeli jeszcze nie ma głosu albo głos w aktualnej pętli jest nowszy...
            latest_votes_for_chart[vote.chart_id] = vote # zapisujemy głos z aktualnej pętli

    
    # tworzenie listy wykresów i przypisanie do nich głosów użytkownika
    chart_to_display = []
    for chart in charts:
        requester_vote = latest_votes_for_chart.get(chart.id, None) 
        if requester_vote is not None:
            vote_value = requester_vote.user_vote
            vote_time = requester_vote.vote_time
        else:
            vote_value = None
            vote_time = None

        ## liczenie liczby rewizji dla danego wykresu
        chart_revisions = db.session.execute(sa.select(Vote).where(Vote.chart_id == chart.id,Vote.interacting_user == user.id)).scalars().all()
        print(chart_revisions)
        revision_count = len(chart_revisions)
        print(revision_count)
        print("loop happened")


        chart_to_display.append({
            "chart_id": chart.id,
            "requester_vote": vote_value , 
            "vote_time": vote_time ,
            "revision_count": revision_count , 
        })

    return render_template(
        'admin_user_detail.html' , user=user , 
        chart_data=chart_to_display, 
        next_page = next_page , prev_page = prev_page , total_pages = total_pages, current_page = page 
        )

@app.route('/admin/users/<int:user_id>/chart/<int:chart_id>/revisions')
@admin_required
def admin_vote_revisions(user_id, chart_id):
    revisions = db.session.execute(sa.select(Vote).where(Vote.chart_id == chart_id,Vote.interacting_user == user_id)).scalars().all()

    if not revisions:
        abort(404)
    
    return render_template(
        'admin_vote_revisions.html', 
        revisions = revisions , user_id = user_id , chart_id = chart_id 
        )

@app.route('/admin/charts')
@admin_required
def admin_charts():

    ## Paginacja

    page = request.args.get( 'page' , 1 , type = int )
    per_page = 10 
    offset = (page - 1) * per_page
    charts = db.session.execute(sa.select(Chart).offset(offset).limit(per_page)).scalars().all() 

    total_charts = db.session.query(Chart).count()
    total_pages = (total_charts-1) // per_page + 1

    next_page = page + 1 if page*per_page < total_charts else None 
    prev_page = page -1 if page >1 else None

    ## Wyświetlanie listy użytkowników

    charts_to_display = []
    for chart in charts:

        chart_votes_all = db.session.execute(sa.select(Vote).where(Vote.chart_id == chart.id)).scalars().all() # all chart's votes
        latest_votes_for_chart = {} # dict na najnowsze głosy
        for vote in chart_votes_all:
            if vote.interacting_user not in latest_votes_for_chart or vote.revision_number > latest_votes_for_chart[vote.interacting_user].revision_number: 
                latest_votes_for_chart[vote.interacting_user] = vote
        
        chart_votes_count = len(latest_votes_for_chart)
        chart_votes_0 = 0
        chart_votes_1 = 0
        for vote in latest_votes_for_chart.values():
            if vote.user_vote == 0:
                chart_votes_0 += 1
            else:
                chart_votes_1 += 1
        
        chart_votes_0_perc = (chart_votes_0 / chart_votes_count) * 100 if chart_votes_count > 0 else 0
        chart_votes_1_perc = (chart_votes_1 / chart_votes_count) * 100 if chart_votes_count > 0 else 0

        charts_to_display.append({
            'chart_id' : chart.id ,
            'chart_votes_count' : chart_votes_count ,  
            'chart_votes_0' : chart_votes_0 , 
            'chart_votes_1' : chart_votes_1 ,
            'chart_votes_0_perc' : round(chart_votes_0_perc, 2) , 
            'chart_votes_1_perc' : round(chart_votes_1_perc, 2)
        })

    return render_template(
        'admin_charts.html', 
        charts_to_display = charts_to_display , 
        next_page = next_page , prev_page = prev_page , total_pages = total_pages, current_page = page 
        )


@app.route('/admin/charts/<int:chart_id>')
@admin_required
def admin_charts_detail(chart_id):
    chart = db.session.execute(sa.select(Chart).where(Chart.id == chart_id)).scalar()

    ## Tabela wyświetlająca wszystkie głosy na wykres

    chart_votes_all = db.session.execute(sa.select(Vote).where(Vote.chart_id == chart.id)).scalars().all() # wszystkie głosy wykresu
    latest_votes_for_chart = {} # dict na najnowsze głosy
    for vote in chart_votes_all:
        if vote.interacting_user not in latest_votes_for_chart or vote.revision_number > latest_votes_for_chart[vote.interacting_user].revision_number: 
            latest_votes_for_chart[vote.interacting_user] = vote
    
    votes_to_display = []
    for vote in latest_votes_for_chart.values():
        print(vote)
        votes_to_display.append({
            'vote_id' : vote.id , 
            'user_vote' : vote.user_vote , 
            'interacting_user' : vote.interacting_user , 
            'vote_time' : timeformat(vote.vote_time) , 
            'revision_number' : vote.revision_number
        })
    
    ## Paginacja

    page = request.args.get( 'page' , 1 , type = int )
    per_page = 10 
    offset = (page - 1) * per_page

    total_charts = len(latest_votes_for_chart)
    total_pages = (total_charts-1) // per_page + 1

    next_page = page + 1 if page*per_page < total_charts else None 
    prev_page = page -1 if page >1 else None

    paginated_votes = votes_to_display[offset:offset + per_page] # nie da się wczytać tylko specyficznych głosów, więc wcześniej wczytujemy wszystkie i slicujemy liste
    
    return render_template(
        'admin_charts_detail.html' , 
        chart_id = chart_id, votes_to_display = paginated_votes , 
        next_page = next_page , prev_page = prev_page , total_pages = total_pages, current_page = page 
        )
