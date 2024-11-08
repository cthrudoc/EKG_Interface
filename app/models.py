from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional
import sqlalchemy as sa
import sqlalchemy.orm as so
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db, login

#strefa czasowa
wars_tz = ZoneInfo('Europe/Warsaw')

class User(UserMixin, db.Model):
    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    username: so.Mapped[str] = so.mapped_column(sa.String(64), index=True,unique=True)
    email: so.Mapped[str] = so.mapped_column(sa.String(120), index=True,unique=True)
    password_hash: so.Mapped[Optional[str]] = so.mapped_column(sa.String(256))
    about_me: so.Mapped[Optional[str]] = so.mapped_column(sa.String(140))
    last_seen: so.Mapped[Optional[datetime]] = so.mapped_column(default=lambda: datetime.now(wars_tz))
    last_chart: so.Mapped[Optional[int]] = so.mapped_column(sa.Integer, default=1)
    is_admin: so.Mapped[bool] = so.mapped_column(sa.Boolean, default=False)

    posts: so.WriteOnlyMapped['Post'] = so.relationship(back_populates='author')
    login_times: so.WriteOnlyMapped['User_Login'] = so.relationship(back_populates='user')
    user_votes: so.WriteOnlyMapped['Vote'] = so.relationship(back_populates="interacter")

    def __repr__(self):
        return '<User {}>'.format(self.username)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login.user_loader
def load_user(id):
    return db.session.get(User, int(id))

class Post(db.Model):
    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    body: so.Mapped[str] = so.mapped_column(sa.String(140))
    timestamp: so.Mapped[datetime] = so.mapped_column(index=True, default=lambda: datetime.now(wars_tz))
    user_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(User.id),index=True)

    author: so.Mapped[User] = so.relationship(back_populates='posts')

    def __repr__(self):
        return '<Post {}>'.format(self.body)
    
class User_Login(db.Model): 
    id: so.Mapped[int] = so.mapped_column(primary_key=True) 
    user_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(User.id),index=True) # !!! WHY DOES IT WORK ???
    login_time: so.Mapped[datetime] = so.mapped_column(default=lambda: datetime.now(wars_tz)) 
    
    user: so.Mapped[User] = so.relationship(back_populates='login_times')

class Vote(db.Model): 
    id: so.Mapped[int] = so.mapped_column(primary_key=True) 
    user_vote: so.Mapped[int] = so.mapped_column(sa.Integer) 
    vote_time: so.Mapped[datetime] = so.mapped_column(default=lambda: datetime.now(wars_tz)) 
    interacting_user: so.Mapped[int] = so.mapped_column(sa.ForeignKey(User.id),index=True)
    chart_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey("chart.id"), index=True) # "Chart.id" bo klasa Chart jest zdefiniowana po klasie Vote
    revision_number: so.Mapped[int] = so.mapped_column(sa.Integer, nullable=False) # wersja głosu

    interacter: so.Mapped[User] = so.relationship(back_populates = 'user_votes')
    chart: so.Mapped["Chart"] = so.relationship(back_populates = 'chart_votes') # "Chart" zamiast Chart ponieważ klasa Chart jeszcze nie istnieje i bez "" jest błąd

class Chart(db.Model):
    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    chart_data: so.Mapped[str] = so.mapped_column(sa.String(100), default="[PLACEHOLDER]")
    
    model_timespans: so.Mapped['Model_Timespans'] = so.relationship(back_populates='chart')
    user_timespans: so.Mapped['User_Timespans'] = so.relationship(back_populates='chart')

    chart_votes: so.Mapped['Vote'] = so.relationship(back_populates='chart')

class Model_Timespans(db.Model):
    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    model_timespan_start: so.Mapped[float] = so.mapped_column(sa.Float, nullable=False)
    model_timespan_end: so.Mapped[float] = so.mapped_column(sa.Float, nullable=False)
    chart_id: so.Mapped[int] = so.mapped_column(sa.Integer, sa.ForeignKey('chart.id'), nullable=False)

    chart: so.Mapped['Chart'] = so.relationship(back_populates='model_timespans')

class User_Timespans(db.Model):
    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    user_timespan_start: so.Mapped[float] = so.mapped_column(sa.Float, nullable=False)
    user_timespan_end: so.Mapped[float] = so.mapped_column(sa.Float, nullable=False)
    chart_id: so.Mapped[int] = so.mapped_column(sa.Integer, sa.ForeignKey('chart.id'), nullable=False)

    chart: so.Mapped['Chart'] = so.relationship(back_populates='user_timespans')