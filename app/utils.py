from app import db
import models
from sqlalchemy.exc import SQLAlchemyError

# [TODO] DOESN'T WORK :(

# Function for manually adding model timespans. ONLY FOR TESTING.
def add_model_timespan(model_timespan_start, model_timespan_end, chart_id):
    try:
        timespan = Model_Timespans(
            model_timespan_start=model_timespan_start, 
            model_timespan_end=model_timespan_end, 
            chart_id=chart_id
        )
        db.session.add(timespan)
        db.session.commit()
        print(f"[add_model_timespan]: Model timespan with start [{model_timespan_start}] and end [{model_timespan_end}] added to chart [{chart_id}].")
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"[Error] Failed to add model timespan: {e}")

add_model_timespan(200, 210, 1)