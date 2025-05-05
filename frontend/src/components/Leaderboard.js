import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Container, 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableRow, 
    Paper,
    Button,
    TextField,
    Select,
    MenuItem,
    Typography,
    Box,
    styled
} from '@mui/material';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px',
    color: 'white'
}));

const StyledTableCell = styled(TableCell)({
    color: 'white',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '16px',
    padding: '16px 8px'
});

const StyledTableRow = styled(TableRow)({
    '&.highlighted': {
        backgroundColor: '#1a75ff',
    },
    '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
    }
});

const StyledTextField = styled(TextField)({
    '& .MuiOutlinedInput-root': {
        color: 'white',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.3)',
        },
    },
    '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.7)',
    },
});

const StyledSelect = styled(Select)({
    color: 'white',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
});

const RecalculateButton = styled(Button)({
    backgroundColor: '#1a75ff',
    color: 'white',
    borderRadius: '8px',
    padding: '8px 24px',
    '&:hover': {
        backgroundColor: '#1557b0',
    },
});

const Leaderboard = () => {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('');
    const [searchId, setSearchId] = useState('');

    const fetchLeaderboard = async () => {
        try {
            const params = new URLSearchParams();
            if (filter) params.append('filter', filter);
            if (searchId) params.append('userId', searchId);
            
            const response = await axios.get(`${process.env.REACT_APP_API_ENDPOINT}leaderboard?${params}`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const recalculateLeaderboard = async () => {
        try {
            await axios.post(`${process.env.REACT_APP_API_ENDPOINT}leaderboard/recalculate`);
            fetchLeaderboard();
        } catch (error) {
            console.error('Error recalculating leaderboard:', error);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [filter, searchId]);

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h2" sx={{ color: 'white', mb: 4, fontWeight: 'bold' }}>
                Leaderboard
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                    <StyledTextField
                        fullWidth
                        placeholder="Search by User ID"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        variant="outlined"
                    />
                    <StyledSelect
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value="">Filter</MenuItem>
                        <MenuItem value="day">Today</MenuItem>
                        <MenuItem value="month">This Month</MenuItem>
                        <MenuItem value="year">This Year</MenuItem>
                    </StyledSelect>
                </Box>
                <RecalculateButton
                    variant="contained"
                    onClick={recalculateLeaderboard}
                >
                    Recalculate
                </RecalculateButton>
            </Box>

            <StyledPaper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledTableCell>#</StyledTableCell>
                            <StyledTableCell>User ID</StyledTableCell>
                            <StyledTableCell>Name</StyledTableCell>
                            <StyledTableCell align="right">Points</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user, index) => (
                            <StyledTableRow 
                                key={user.userId}
                                className={index === 0 ? 'highlighted' : ''}
                            >
                                <StyledTableCell>{user.tempRank || user.rank}</StyledTableCell>
                                <StyledTableCell>{user.userId}</StyledTableCell>
                                <StyledTableCell>{user.fullName}</StyledTableCell>
                                <StyledTableCell align="right">
                                    {filter ? user.filteredPoints : user.totalPoints}
                                </StyledTableCell>
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </StyledPaper>
        </Container>
    );
};

export default Leaderboard;