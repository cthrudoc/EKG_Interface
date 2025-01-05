import random

# Configuration
num_charts = 12
min_timespans = 4
max_timespans = 6
start_range = 0
end_range = 260
min_duration = 1
max_duration = 5

# Function to generate a single insert statement for a chart
def generate_insert_statements(chart_id):
    num_timespans = random.randint(min_timespans, max_timespans)
    insert_statements = []

    for _ in range(num_timespans):
        start = round(random.uniform(start_range, end_range - max_duration), 2)
        end = round(min(start + random.uniform(min_duration, max_duration), end_range), 2)
        insert_statements.append(
            f"({start}, {end}, {chart_id}, 'cardiomyopathic change')"
        )

    return insert_statements

# Generate all insert statements for charts 1 to 12
sql_statements = ["-- Insert mockup data for Model_Timespans"]

for chart_id in range(1, num_charts + 1):
    inserts = generate_insert_statements(chart_id)
    statement = f"INSERT INTO model__timespans (model_timespan_start, model_timespan_end, chart_id, model_proposition) VALUES\n"
    statement += ",\n".join(inserts) + ";"
    sql_statements.append(statement)

# Output the SQL statements
output_file = "mock_model_timespans.sql"
with open(output_file, "w") as file:
    file.write("\n".join(sql_statements))

print(f"SQL script generated: {output_file}")
