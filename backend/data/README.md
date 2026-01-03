# Data Directory

This folder contains data files, task definitions, and output results for the Gold Loan Appraisal System.

## Files

### Task Definitions (CSV)
- **task_sequence.csv** - Task definitions for rubbing test detection
- **task_sequence_main.csv** - Task definitions for acid test detection

These files define the object pairs that the YOLO model should detect and the conditions for task completion.

### Results and Outputs
- **result.txt** - Processing results and logs
- **model_results.txt** - Model training/testing results

## CSV File Format

Task definition files use the following format:

```csv
target1,target2,label,hold_seconds,min_fluctuations
stone,gold,Rubbing Task,5,3
dropper,gold,Acid Testing Task,6,2
```

### Column Descriptions:
- **target1**: First object to detect
- **target2**: Second object to detect (must be near target1)
- **label**: Task description
- **hold_seconds**: How long objects must be detected together
- **min_fluctuations**: Minimum times the pair must be detected (prevents false positives)

## Usage

The purity testing service automatically loads these files:
```python
from services.purity_testing_service import PurityTestingService

service = PurityTestingService()
# CSV files are loaded from data/ directory
```

## Adding New Tasks

1. Edit the appropriate CSV file
2. Add a new row with your task definition
3. Restart the service to load new tasks

Example:
```csv
target1,target2,label,hold_seconds,min_fluctuations
magnifier,gold,Visual Inspection,4,2
```

## Notes

- CSV files must be UTF-8 encoded
- Column names must match exactly
- Numeric values for hold_seconds and min_fluctuations
- Object names must match YOLO model class names
