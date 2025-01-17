"""Added ECGSegment class and made a relationship to Chart class

Revision ID: 5f89da2f24af
Revises: 086239b0ed72
Create Date: 2024-10-24 17:43:30.082599

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5f89da2f24af'
down_revision = '086239b0ed72'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('ecg_segment',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('start_time', sa.Float(), nullable=False),
    sa.Column('end_time', sa.Float(), nullable=False),
    sa.Column('json_file_path', sa.String(), nullable=False),
    sa.Column('chart_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['chart_id'], ['chart.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('ecg_segment')
    # ### end Alembic commands ###
