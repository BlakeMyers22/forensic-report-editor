import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Rating, 
  TextField,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

const ReportSection = ({ section, content, onFeedback }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          content,
          rating,
          comment,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      
      setAlert({
        show: true,
        message: 'Thank you! Your feedback will help improve future reports.',
        severity: 'success'
      });
      setShowFeedback(false);
      setRating(0);
      setComment('');
    } catch (error) {
      setAlert({
        show: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} className="p-6 mb-6">
      <Typography variant="h5" className="mb-4 font-bold">
        {section}
      </Typography>
      <Typography className="whitespace-pre-wrap mb-4">
        {content}
      </Typography>
      
      {!showFeedback ? (
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => setShowFeedback(true)}
          className="mt-4"
        >
          Rate This Section
        </Button>
      ) : (
        <Box className="mt-4 p-4 bg-gray-50 rounded">
          <Typography variant="h6" className="mb-2">
            Provide Feedback
          </Typography>
          <Box className="mb-2">
            <Typography component="legend">Rating (1-7)</Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              max={7}
              size="large"
            />
          </Box>
          <TextField
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            placeholder="Your comments will help improve future reports..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mb-4"
          />
          <Box className="flex gap-2">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitFeedback}
              disabled={isSubmitting || !rating}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Submit Feedback'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowFeedback(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}
      
      <Snackbar 
        open={alert.show} 
        autoHideDuration={6000} 
        onClose={() => setAlert({ ...alert, show: false })}
      >
        <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, show: false })}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

const App = () => {
  const [sections, setSections] = useState({});
  const [isLoading, setIsLoading] = useState({});

  const generateSection = async (sectionName) => {
    setIsLoading(prev => ({ ...prev, [sectionName]: true }));
    try {
      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: sectionName,
          context: {
            // Add your context here
          }
        })
      });

      const data = await response.json();
      setSections(prev => ({
        ...prev,
        [sectionName]: data.content
      }));
    } catch (error) {
      console.error('Error generating section:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, [sectionName]: false }));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container className="py-8">
        <Typography variant="h3" className="mb-6">
          Forensic Report Generator
        </Typography>
        
        {['Authorization', 'Background', 'Observations', 'Conclusions'].map(section => (
          <Box key={section} className="mb-6">
            {!sections[section] ? (
              <Button
                variant="contained"
                onClick={() => generateSection(section)}
                disabled={isLoading[section]}
              >
                {isLoading[section] ? (
                  <CircularProgress size={24} />
                ) : (
                  `Generate ${section} Section`
                )}
              </Button>
            ) : (
              <ReportSection
                section={section}
                content={sections[section]}
                onFeedback={(feedback) => console.log(feedback)}
              />
            )}
          </Box>
        ))}
      </Container>
    </ThemeProvider>
  );
};

export default App;
